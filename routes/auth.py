from flask import Blueprint, jsonify, request, session, current_app
from models import db, User
from flask_mail import Mail, Message

bp = Blueprint('auth', __name__)


def current_user_id():
    return session.get('user_id')


def login_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Authentication required', 'code': 401}), 401
        return fn(*args, **kwargs)
    return wrapper


@bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    email    = (data.get('email')    or '').strip().lower()
    password = (data.get('password') or '').strip()
    avatar   = (data.get('avatar')   or '👤').strip()

    if not username or not email or not password:
        return jsonify({'error': 'Username, email and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(username=username, email=email, avatar=avatar)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    session['user_id'] = user.id
    session.permanent  = True
    return jsonify({'user': user.to_dict()}), 201


@bp.route('/api/auth/login', methods=['POST'])
def login():
    data     = request.get_json() or {}
    identity = (data.get('identity') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not identity or not password:
        return jsonify({'error': 'Identity and password are required'}), 400

    user = (User.query.filter_by(username=identity).first() or
            User.query.filter_by(email=identity).first())

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    session['user_id'] = user.id
    session.permanent  = True
    return jsonify({'user': user.to_dict()})


@bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})


@bp.route('/api/auth/me')
def me():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'user': None})
    user = User.query.get(uid)
    if not user:
        session.clear()
        return jsonify({'user': None})
    return jsonify({'user': user.to_dict()})


@bp.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data  = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    # Always return success to avoid user enumeration
    if user:
        token = user.generate_reset_token()
        db.session.commit()
        _send_reset_email(user, token)

    return jsonify({'success': True})


@bp.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data     = request.get_json() or {}
    token    = (data.get('token')    or '').strip()
    password = (data.get('password') or '').strip()

    if not token or not password:
        return jsonify({'error': 'Token and new password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user or not user.is_reset_token_valid(token):
        return jsonify({'error': 'This reset link is invalid or has expired'}), 400

    user.set_password(password)
    user.clear_reset_token()
    db.session.commit()
    return jsonify({'success': True})


@bp.route('/api/auth/account', methods=['DELETE'])
@login_required
def delete_account():
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    db.session.delete(user)
    db.session.commit()
    session.clear()
    return jsonify({'success': True})


def _send_reset_email(user, token):
    from app import mail
    reset_url = f"{request.host_url.rstrip('/')}/#/reset-password?token={token}"
    msg = Message(
        subject='Reset your TYME TYBLE password',
        recipients=[user.email],
        html=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#12121e;color:#e2e8f0;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#fff">Reset your password</h2>
          <p style="color:#94a3b8;margin:0 0 24px">Hi {user.username}, click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="{reset_url}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Reset Password</a>
          <p style="color:#475569;font-size:12px;margin-top:24px">If you didn't request this, ignore this email — your password won't change.</p>
        </div>
        """
    )
    mail.send(msg)
