from textblob import TextBlob

LABELS = {'positive', 'neutral', 'negative'}

def classify_sentiment(text: str) -> dict:
    """Lightweight lexicon polarity, not a clinical or context-aware model."""
    polarity = float(TextBlob(text).sentiment.polarity)
    label = 'positive' if polarity > 0.12 else 'negative' if polarity < -0.12 else 'neutral'
    return {'label': label, 'score': round(polarity, 3)}

def reply_for(text: str, sentiment: str) -> str:
    if sentiment == 'positive':
        return 'That sounds positive. What part of it matters most to you?'
    if sentiment == 'negative':
        return 'That sounds difficult. Would you like to share a little more about what happened?'
    return 'I’m here to help. What would you like to explore next?'

