import pytest
from app import create_app
from app.models import _db

@pytest.fixture()
def client(tmp_path):
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'test.db'}", 'JWT_SECRET_KEY': 'test-secret'})
    with app.test_client() as client:
        yield client
    with app.app_context():
        _db.drop_all()

def register(client, email):
    return client.post('/api/auth/register', json={'email': email, 'password': 'correct horse battery staple'})

def test_register_login_and_password_hash(client):
    response = register(client, 'a@example.com')
    assert response.status_code == 201
    token = response.json['token']
    assert 'password_hash' not in response.json['user']
    assert client.post('/api/auth/login', json={'email':'a@example.com','password':'wrong password'}).status_code == 401
    assert client.get('/api/conversations', headers={'Authorization':f'Bearer {token}'}).json == []

def test_user_cannot_read_or_delete_another_users_conversation(client):
    first = register(client, 'a@example.com').json['token']
    second = register(client, 'b@example.com').json['token']
    convo = client.post('/api/conversations', headers={'Authorization':f'Bearer {first}'}).json['id']
    headers = {'Authorization':f'Bearer {second}'}
    assert client.get(f'/api/conversations/{convo}/messages', headers=headers).status_code == 404
    assert client.delete(f'/api/conversations/{convo}', headers=headers).status_code == 404

def test_send_message_returns_sentiment_and_bounded_reply(client):
    token = register(client, 'a@example.com').json['token']
    headers = {'Authorization':f'Bearer {token}'}
    convo = client.post('/api/conversations', headers=headers).json['id']
    result = client.post(f'/api/conversations/{convo}/messages', headers=headers, json={'content':'I love this wonderful day!'} )
    assert result.status_code == 200
    assert result.json['messages'][0]['sentiment']['label'] == 'positive'
    assert result.json['messages'][1]['role'] == 'assistant'
    assert client.post(f'/api/conversations/{convo}/messages', headers=headers, json={'content':'x' * 4001}).status_code == 400

