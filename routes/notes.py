from flask import Blueprint, jsonify, request
from models import db, Note
from routes.auth import login_required, current_user_id

bp = Blueprint('notes', __name__)


@bp.route('/api/notes', methods=['GET'])
@login_required
def list_notes():
    uid   = current_user_id()
    date  = request.args.get('date')
    q     = Note.query.filter_by(user_id=uid)
    if date:
        q = q.filter_by(date=date)
    notes = q.order_by(Note.created_at.desc()).all()
    return jsonify({'notes': [n.to_dict() for n in notes]})


@bp.route('/api/notes', methods=['POST'])
@login_required
def create():
    data = request.get_json() or {}
    if not data.get('date') or not data.get('content'):
        return jsonify({'error': 'date and content are required'}), 400
    note = Note(
        user_id=current_user_id(),
        date=data['date'],
        title=data.get('title', ''),
        content=data['content'],
        color=data.get('color', 'default'),
    )
    db.session.add(note)
    db.session.commit()
    return jsonify(note.to_dict()), 201


@bp.route('/api/notes/<int:note_id>', methods=['PUT'])
@login_required
def update(note_id):
    note = Note.query.filter_by(id=note_id, user_id=current_user_id()).first_or_404()
    data = request.get_json() or {}
    if 'title'   in data: note.title   = data['title']
    if 'content' in data: note.content = data['content']
    if 'color'   in data: note.color   = data['color']
    db.session.commit()
    return jsonify(note.to_dict())


@bp.route('/api/notes/<int:note_id>', methods=['DELETE'])
@login_required
def delete(note_id):
    note = Note.query.filter_by(id=note_id, user_id=current_user_id()).first_or_404()
    db.session.delete(note)
    db.session.commit()
    return jsonify({'success': True})
