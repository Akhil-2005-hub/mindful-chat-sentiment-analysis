import os
from datetime import timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash
from .models import _db, User, Conversation, Message
from .nlp import classify_sentiment, reply_for

MAX_MESSAGE_CHARS = 4000

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.getenv('SECRET_KEY', 'dev-only-change-me'),
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY', 'dev-only-change-me-too'),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=8),
        SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URL', 'sqlite:///mindful_chat.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JSON_SORT_KEYS=False,
    )
    if test_config:
        app.config.update(test_config)
    _db.init_app(app)
    JWTManager(app)
    origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
    CORS(app, resources={r'/api/*': {'origins': origins}}, supports_credentials=False)

    with app.app_context():
        _db.create_all()

    def error(message, status):
        return jsonify({'error': message}), status

    @app.get('/api/health')
    def health():
        return jsonify({'status': 'ok'})

    @app.post('/api/auth/register')
    def register():
        data = request.get_json(silent=True) or {}
        email = str(data.get('email', '')).strip().lower()
        password = data.get('password', '')
        if len(email) > 254 or '@' not in email:
            return error('Enter a valid email address.', 400)
        if not isinstance(password, str) or len(password) < 10 or len(password) > 128:
            return error('Password must be 10–128 characters.', 400)
        user = User(email=email, password_hash=generate_password_hash(password, method='scrypt'))
        _db.session.add(user)
        try:
            _db.session.commit()
        except IntegrityError:
            _db.session.rollback()
            return error('An account with this email already exists.', 409)
        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'user': {'id': user.id, 'email': user.email}}), 201

    @app.post('/api/auth/login')
    def login():
        data = request.get_json(silent=True) or {}
        email = str(data.get('email', '')).strip().lower()
        password = data.get('password', '')
        user = User.query.filter_by(email=email).first()
        if not user or not isinstance(password, str) or not check_password_hash(user.password_hash, password):
            return error('Email or password is incorrect.', 401)
        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'user': {'id': user.id, 'email': user.email}})

    @app.get('/api/conversations')
    @jwt_required()
    def list_conversations():
        uid = int(get_jwt_identity())
        rows = Conversation.query.filter_by(user_id=uid).order_by(Conversation.created_at.desc()).all()
        return jsonify([{'id': c.id, 'title': c.title, 'createdAt': c.created_at.isoformat()} for c in rows])

    @app.post('/api/conversations')
    @jwt_required()
    def create_conversation():
        uid = int(get_jwt_identity())
        row = Conversation(user_id=uid)
        _db.session.add(row)
        _db.session.commit()
        return jsonify({'id': row.id, 'title': row.title, 'createdAt': row.created_at.isoformat()}), 201

    @app.get('/api/conversations/<int:conversation_id>/messages')
    @jwt_required()
    def get_messages(conversation_id):
        uid = int(get_jwt_identity())
        convo = Conversation.query.filter_by(id=conversation_id, user_id=uid).first()
        if not convo:
            return error('Conversation not found.', 404)
        return jsonify([{'id': m.id, 'role': m.role, 'content': m.content, 'sentiment': ({'label': m.sentiment, 'score': m.sentiment_score} if m.sentiment else None), 'createdAt': m.created_at.isoformat()} for m in convo.messages])

    @app.post('/api/conversations/<int:conversation_id>/messages')
    @jwt_required()
    def send_message(conversation_id):
        uid = int(get_jwt_identity())
        convo = Conversation.query.filter_by(id=conversation_id, user_id=uid).first()
        if not convo:
            return error('Conversation not found.', 404)
        data = request.get_json(silent=True) or {}
        content = data.get('content', '')
        if not isinstance(content, str) or not content.strip() or len(content) > MAX_MESSAGE_CHARS:
            return error(f'Message must contain 1–{MAX_MESSAGE_CHARS} characters.', 400)
        content = content.strip()
        analysis = classify_sentiment(content)
        user_msg = Message(conversation_id=convo.id, role='user', content=content, sentiment=analysis['label'], sentiment_score=analysis['score'])
        assistant_msg = Message(conversation_id=convo.id, role='assistant', content=reply_for(content, analysis['label']))
        if convo.title == 'New conversation':
            convo.title = content[:60] + ('…' if len(content) > 60 else '')
        _db.session.add_all([user_msg, assistant_msg])
        _db.session.commit()
        return jsonify({'messages': [
            {'id': user_msg.id, 'role': user_msg.role, 'content': user_msg.content, 'sentiment': analysis, 'createdAt': user_msg.created_at.isoformat()},
            {'id': assistant_msg.id, 'role': assistant_msg.role, 'content': assistant_msg.content, 'sentiment': None, 'createdAt': assistant_msg.created_at.isoformat()},
        ]})

    @app.delete('/api/conversations/<int:conversation_id>')
    @jwt_required()
    def delete_conversation(conversation_id):
        uid = int(get_jwt_identity())
        convo = Conversation.query.filter_by(id=conversation_id, user_id=uid).first()
        if not convo:
            return error('Conversation not found.', 404)
        _db.session.delete(convo)
        _db.session.commit()
        return '', 204

    return app



