from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

_db = SQLAlchemy()

def now_utc():
    return datetime.now(timezone.utc)

class User(_db.Model):
    id = _db.Column(_db.Integer, primary_key=True)
    email = _db.Column(_db.String(254), unique=True, nullable=False, index=True)
    password_hash = _db.Column(_db.String(256), nullable=False)
    created_at = _db.Column(_db.DateTime(timezone=True), default=now_utc, nullable=False)
    conversations = _db.relationship('Conversation', backref='owner', cascade='all, delete-orphan', lazy=True)

class Conversation(_db.Model):
    id = _db.Column(_db.Integer, primary_key=True)
    user_id = _db.Column(_db.Integer, _db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False, index=True)
    title = _db.Column(_db.String(80), nullable=False, default='New conversation')
    created_at = _db.Column(_db.DateTime(timezone=True), default=now_utc, nullable=False)
    messages = _db.relationship('Message', backref='conversation', cascade='all, delete-orphan', lazy=True, order_by='Message.created_at')

class Message(_db.Model):
    id = _db.Column(_db.Integer, primary_key=True)
    conversation_id = _db.Column(_db.Integer, _db.ForeignKey('conversation.id', ondelete='CASCADE'), nullable=False, index=True)
    role = _db.Column(_db.String(12), nullable=False)
    content = _db.Column(_db.Text, nullable=False)
    sentiment = _db.Column(_db.String(12), nullable=True)
    sentiment_score = _db.Column(_db.Float, nullable=True)
    created_at = _db.Column(_db.DateTime(timezone=True), default=now_utc, nullable=False)



