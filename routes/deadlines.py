from flask import Blueprint, jsonify, request
from models import db, Deadline
from routes.auth import login_required, current_user_id

bp = Blueprint('deadlines', __name__)


@bp.route('/api/deadlines', methods=['GET'])
@login_required
def list_deadlines():
    uid       = current_user_id()
    date      = request.args.get('date')
    q         = Deadline.query.filter_by(user_id=uid)
    if date:
        q = q.filter_by(date=date)
    deadlines = q.order_by(Deadline.date, Deadline.time).all()
    return jsonify({'deadlines': [d.to_dict() for d in deadlines]})


@bp.route('/api/deadlines', methods=['POST'])
@login_required
def create():
    data = request.get_json() or {}
    if not data.get('date') or not data.get('title'):
        return jsonify({'error': 'date and title are required'}), 400
    dl = Deadline(
        user_id=current_user_id(),
        date=data['date'],
        title=data['title'].strip(),
        time=data.get('time') or None,
        urgent=bool(data.get('urgent', False)),
    )
    db.session.add(dl)
    db.session.commit()
    return jsonify(dl.to_dict()), 201


@bp.route('/api/deadlines/<int:dl_id>', methods=['PUT'])
@login_required
def update(dl_id):
    dl   = Deadline.query.filter_by(id=dl_id, user_id=current_user_id()).first_or_404()
    data = request.get_json() or {}
    if 'title'  in data: dl.title  = data['title'].strip()
    if 'time'   in data: dl.time   = data['time'] or None
    if 'urgent' in data: dl.urgent = bool(data['urgent'])
    if 'date'   in data: dl.date   = data['date']
    db.session.commit()
    return jsonify(dl.to_dict())


@bp.route('/api/deadlines/<int:dl_id>', methods=['DELETE'])
@login_required
def delete(dl_id):
    dl = Deadline.query.filter_by(id=dl_id, user_id=current_user_id()).first_or_404()
    db.session.delete(dl)
    db.session.commit()
    return jsonify({'success': True})
