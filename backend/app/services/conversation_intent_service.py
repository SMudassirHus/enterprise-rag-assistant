import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ConversationalResponse:
    intent: str
    answer: str


GREETING_MESSAGES = {
    "hi",
    "hello",
    "hey",
    "hi there",
    "hello there",
    "hey there",
    "good morning",
    "good afternoon",
    "good evening",
}

WELL_BEING_MESSAGES = {
    "how are you",
    "how are you doing",
    "how is it going",
    "hows it going",
}

THANKS_MESSAGES = {
    "thanks",
    "thank you",
    "thx",
    "thanks a lot",
    "thank you very much",
    "appreciate it",
}


def normalize_message(message: str) -> str:
    """Normalize short chat messages without changing their meaning."""
    lowercase_message = message.strip().lower()
    words_only_message = re.sub(r"[^\w\s']", "", lowercase_message)
    return re.sub(r"\s+", " ", words_only_message).strip()


def get_conversational_response(message: str) -> ConversationalResponse | None:
    """
    Return a local response for simple conversational messages.

    This intentionally uses exact short-message matches so real document
    questions like "hi, what is this document about?" still use RAG retrieval.
    """
    normalized_message = normalize_message(message)

    if normalized_message in GREETING_MESSAGES:
        return ConversationalResponse(
            intent="greeting",
            answer="Hi! How can I help you explore your documents today?",
        )

    if normalized_message in WELL_BEING_MESSAGES:
        return ConversationalResponse(
            intent="well_being",
            answer="I'm doing well and ready to help with your documents. What would you like to explore?",
        )

    if normalized_message in THANKS_MESSAGES:
        return ConversationalResponse(
            intent="thanks",
            answer="You're welcome! Ask me anything else about your documents.",
        )

    return None
