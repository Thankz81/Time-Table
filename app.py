from flask import Flask, render_template
from datetime import timedelta
from models import db
from flask_mail import Mail
import os
from routes.auth      import bp as auth_bp
from routes.calendar  import bp as calendar_bp
from routes.tasks     import bp as tasks_bp
from routes.notes     import bp as notes_bp
from routes.deadlines import bp as deadlines_bp

mail = Mail()

def create_app():
    app = Flask(__name__)

    db_url = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI']        = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY']                     = os.environ.get('SECRET_KEY', 'tyme-tyble-secret-key-change-in-prod')
    app.config['PERMANENT_SESSION_LIFETIME']     = timedelta(days=30)

    # Flask-Mail — set these via environment variables or a .env file
    app.config['MAIL_SERVER']   = os.environ.get('MAIL_SERVER',   'smtp.gmail.com')
    app.config['MAIL_PORT']     = int(os.environ.get('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS']  = os.environ.get('MAIL_USE_TLS',  'true').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', '')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', app.config['MAIL_USERNAME'])

    db.init_app(app)
    mail.init_app(app)

    for bp in (auth_bp, calendar_bp, tasks_bp, notes_bp, deadlines_bp):
        app.register_blueprint(bp)

    with app.app_context():
        db.create_all()

    @app.route('/')
    def index():
        return render_template('index.html')

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
