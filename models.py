from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    id                = db.Column(db.Integer, primary_key=True)
    username          = db.Column(db.String(80),  nullable=False, unique=True)
    email             = db.Column(db.String(120), nullable=False, unique=True)
    password          = db.Column(db.String(256), nullable=False)
    avatar            = db.Column(db.String(4),   nullable=False, default='👤')
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)
    reset_token       = db.Column(db.String(64),  nullable=True)
    reset_token_expiry = db.Column(db.DateTime,   nullable=True)

    tasks     = db.relationship('Task',     backref='user', lazy=True, cascade='all,delete')
    notes     = db.relationship('Note',     backref='user', lazy=True, cascade='all,delete')
    deadlines = db.relationship('Deadline', backref='user', lazy=True, cascade='all,delete')

    def set_password(self, raw):
        self.password = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password, raw)

    def generate_reset_token(self):
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        return self.reset_token

    def clear_reset_token(self):
        self.reset_token = None
        self.reset_token_expiry = None

    def is_reset_token_valid(self, token):
        return (self.reset_token == token and
                self.reset_token_expiry and
                datetime.utcnow() < self.reset_token_expiry)

    def to_dict(self):
        return {'id': self.id, 'username': self.username,
                'email': self.email, 'avatar': self.avatar}


class Task(db.Model):
    __tablename__ = 'tasks'
    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date        = db.Column(db.String(10), nullable=False, index=True)
    title       = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)   # rich HTML content
    status      = db.Column(db.String(20), nullable=False, default='todo')
    priority    = db.Column(db.String(10), nullable=False, default='normal')
    time        = db.Column(db.String(5),  nullable=True)   # HH:MM due time
    bg_color    = db.Column(db.String(20), nullable=True)   # e.g. 'yellow','green','blue','pink'
    font_color  = db.Column(db.String(20), nullable=True)   # css color value
    recur_id    = db.Column(db.Integer, nullable=True, index=True)
    recur_days  = db.Column(db.String(20), nullable=True)
    recur_end   = db.Column(db.String(10), nullable=True)
    link        = db.Column(db.Text, nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'date': self.date,
            'title': self.title, 'description': self.description or '',
            'status': self.status, 'priority': self.priority,
            'time': self.time or '',
            'bg_color': self.bg_color or '',
            'font_color': self.font_color or '',
            'recur_id': self.recur_id,
            'recur_days': self.recur_days or '',
            'recur_end': self.recur_end or '',
            'link': self.link or '',
        }


class Note(db.Model):
    __tablename__ = 'notes'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date       = db.Column(db.String(10), nullable=False, index=True)
    title      = db.Column(db.Text, nullable=True)
    content    = db.Column(db.Text, nullable=False)   # stores HTML with embedded base64 images
    color      = db.Column(db.String(20), nullable=False, default='default')
    font_color = db.Column(db.String(20), nullable=True)   # css color value for card text
    link       = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'date': self.date,
            'title': self.title or '',
            'content': self.content, 'color': self.color,
            'font_color': self.font_color or '',
            'link': self.link or '',
        }


class Deadline(db.Model):
    __tablename__ = 'deadlines'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date       = db.Column(db.String(10), nullable=False, index=True)
    title      = db.Column(db.Text, nullable=False)
    time       = db.Column(db.String(5),  nullable=True)
    urgent     = db.Column(db.Boolean, nullable=False, default=False)
    link       = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'date': self.date,
            'title': self.title, 'time': self.time, 'urgent': self.urgent,
            'link': self.link or '',
        }
