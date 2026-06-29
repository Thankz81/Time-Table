from flask import Blueprint, jsonify, request
from models import db, Task
from routes.auth import login_required, current_user_id
from datetime import date as dt_date, timedelta

bp = Blueprint('tasks', __name__)

WEEKDAY_MAP = {0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun'}


def _expand_recur(task, recur_days_str, recur_end_str, uid):
    """Create sibling recurring task instances for every matching weekday up to recur_end."""
    try:
        days = [int(d) for d in recur_days_str.split(',') if d.strip().isdigit()]
        end  = dt_date.fromisoformat(recur_end_str)
        start = dt_date.fromisoformat(task.date)
    except (ValueError, AttributeError):
        return

    # Generate a shared recur_id from the anchor task id
    recur_id = task.id
    task.recur_id   = recur_id
    task.recur_days = recur_days_str
    task.recur_end  = recur_end_str

    cur = start + timedelta(days=1)
    while cur <= end:
        if cur.weekday() in days:
            sibling = Task(
                user_id     = uid,
                date        = cur.isoformat(),
                title       = task.title,
                description = task.description,
                status      = 'todo',
                priority    = task.priority,
                time        = task.time,
                bg_color    = task.bg_color,
                font_color  = task.font_color,
                recur_id    = recur_id,
                recur_days  = recur_days_str,
                recur_end   = recur_end_str,
            )
            db.session.add(sibling)
        cur += timedelta(days=1)


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
    uid  = current_user_id()
    data = request.get_json() or {}
    if not data.get('date') or not data.get('title'):
        return jsonify({'error': 'date and title are required'}), 400
    task = Task(
        user_id     = uid,
        date        = data['date'],
        title       = data['title'].strip(),
        description = data.get('description', ''),
        status      = data.get('status', 'todo'),
        priority    = data.get('priority', 'normal'),
        time        = data.get('time', '') or None,
        bg_color    = data.get('bg_color', '') or None,
        font_color  = data.get('font_color', '') or None,
        link        = data.get('link', '') or None,
    )
    db.session.add(task)
    db.session.flush()  # get task.id before commit

    recur_days = data.get('recur_days', '')
    recur_end  = data.get('recur_end', '')
    if recur_days and recur_end:
        _expand_recur(task, recur_days, recur_end, uid)

    db.session.commit()
    return jsonify(task.to_dict()), 201


@bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update(task_id):
    uid  = current_user_id()
    task = Task.query.filter_by(id=task_id, user_id=uid).first_or_404()
    data = request.get_json() or {}
    if 'title'       in data: task.title       = data['title'].strip()
    if 'description' in data: task.description = data['description']
    if 'time'        in data: task.time        = data['time'] or None
    if 'status'      in data: task.status      = data['status']
    if 'priority'    in data: task.priority    = data['priority']
    if 'date'        in data: task.date        = data['date']
    if 'bg_color'    in data: task.bg_color    = data['bg_color'] or None
    if 'font_color'  in data: task.font_color  = data['font_color'] or None
    if 'link'        in data: task.link        = data['link'] or None

    # Re-expand recurrence only when recur fields are explicitly included in the payload
    if 'recur_days' in data or 'recur_end' in data:
        recur_days = data.get('recur_days') or ''
        recur_end  = data.get('recur_end')  or ''
        # Delete old siblings whenever recur fields are being changed
        if task.recur_id:
            Task.query.filter(
                Task.recur_id == task.recur_id,
                Task.id != task.id,
                Task.user_id == uid
            ).delete()
        task.recur_days = recur_days or None
        task.recur_end  = recur_end or None
        task.recur_id   = None
        if recur_days and recur_end:
            db.session.flush()
            _expand_recur(task, recur_days, recur_end, uid)

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
    uid  = current_user_id()
    task = Task.query.filter_by(id=task_id, user_id=uid).first_or_404()
    scope = request.args.get('scope', 'one')  # 'one' | 'all'
    if scope == 'all' and task.recur_id:
        Task.query.filter_by(recur_id=task.recur_id, user_id=uid).delete()
    else:
        db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})
