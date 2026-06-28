from flask import Blueprint, jsonify, request
from models import Task, Note, Deadline
from routes.auth import login_required, current_user_id

bp = Blueprint('calendar', __name__)


@bp.route('/api/summary')
@login_required
def summary():
    year  = request.args.get('year',  type=int)
    month = request.args.get('month', type=int)
    if not year or not month:
        return jsonify({'error': 'year and month are required'}), 400

    uid    = current_user_id()
    prefix = f'{year:04d}-{month:02d}-%'

    task_dates = {d for (d,) in Task.query.filter_by(user_id=uid)
                  .filter(Task.date.like(prefix)).with_entities(Task.date).all()}
    note_dates = {d for (d,) in Note.query.filter_by(user_id=uid)
                  .filter(Note.date.like(prefix)).with_entities(Note.date).all()}
    dl_dates   = {d for (d,) in Deadline.query.filter_by(user_id=uid)
                  .filter(Deadline.date.like(prefix)).with_entities(Deadline.date).all()}

    all_dates = task_dates | note_dates | dl_dates
    result = {
        d: {'tasks': d in task_dates, 'notes': d in note_dates, 'deadlines': d in dl_dates}
        for d in all_dates
    }
    return jsonify(result)


@bp.route('/api/day/<date>')
@login_required
def day_detail(date):
    uid = current_user_id()
    tasks     = Task.query.filter_by(user_id=uid, date=date).order_by(Task.created_at).all()
    notes     = Note.query.filter_by(user_id=uid, date=date).order_by(Note.created_at).all()
    deadlines = Deadline.query.filter_by(user_id=uid, date=date)\
                              .order_by(Deadline.time, Deadline.created_at).all()
    return jsonify({
        'date':      date,
        'tasks':     [t.to_dict() for t in tasks],
        'notes':     [n.to_dict() for n in notes],
        'deadlines': [d.to_dict() for d in deadlines],
    })


@bp.route('/api/upcoming')
@login_required
def upcoming():
    """Return tasks + deadlines for the next 7 days."""
    from datetime import date as dt_date, timedelta
    uid   = current_user_id()
    today = dt_date.today()
    dates = [(today + timedelta(days=i)).isoformat() for i in range(7)]

    tasks     = Task.query.filter_by(user_id=uid)\
                          .filter(Task.date.in_(dates)).order_by(Task.date).all()
    deadlines = Deadline.query.filter_by(user_id=uid)\
                              .filter(Deadline.date.in_(dates)).order_by(Deadline.date, Deadline.time).all()
    return jsonify({
        'tasks':     [t.to_dict() for t in tasks],
        'deadlines': [d.to_dict() for d in deadlines],
    })


@bp.route('/api/stats')
@login_required
def stats():
    """Overall stats for the current user."""
    uid = current_user_id()
    total_tasks      = Task.query.filter_by(user_id=uid).count()
    done_tasks       = Task.query.filter_by(user_id=uid, status='done').count()
    total_deadlines  = Deadline.query.filter_by(user_id=uid).count()
    total_notes      = Note.query.filter_by(user_id=uid).count()
    return jsonify({
        'total_tasks': total_tasks, 'done_tasks': done_tasks,
        'total_deadlines': total_deadlines, 'total_notes': total_notes,
    })
