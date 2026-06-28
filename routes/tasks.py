from flask import Blueprint, jsonify, request
from models import db, Task
from routes.auth import login_required, current_user_id

bp = Blueprint('tasks', __name__)


@bp.route('/api/tasks', methods=['GET'])
@login_required
def list_tasks():
    uid  = current_user_id()
    date = request.args.get('date')
    q    = Task.query.filter_by(user_id=uid)
    if date:
        q = q.filter_by(date=date)
    tasks = q.order_by(Task.date, Task.created_at).all()
    return jsonify({'tasks': [t.to_dict() for t in tasks]})


@bp.route('/api/tasks', methods=['POST'])
@login_required
def create():
    data = request.get_json() or {}
    if not data.get('date') or not data.get('title'):
        return jsonify({'error': 'date and title are required'}), 400
    task = Task(
        user_id=current_user_id(),
        date=data['date'],
        title=data['title'].strip(),
        description=data.get('description', ''),
        status=data.get('status', 'todo'),
        priority=data.get('priority', 'normal'),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user_id()).first_or_404()
    data = request.get_json() or {}
    if 'title'       in data: task.title       = data['title'].strip()
    if 'description' in data: task.description = data['description']
    if 'status'      in data: task.status      = data['status']
    if 'priority'    in data: task.priority    = data['priority']
    if 'date'        in data: task.date        = data['date']
    db.session.commit()
    return jsonify(task.to_dict())


@bp.route('/api/tasks/<int:task_id>/status', methods=['PATCH'])
@login_required
def update_status(task_id):
    task   = Task.query.filter_by(id=task_id, user_id=current_user_id()).first_or_404()
    data   = request.get_json() or {}
    status = data.get('status')
    if status not in ('todo', 'in-progress', 'done'):
        return jsonify({'error': 'Invalid status'}), 400
    task.status = status
    db.session.commit()
    return jsonify(task.to_dict())


@bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user_id()).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})
