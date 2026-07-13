"""
Custom LangChain ChatModel that calls the ITI Egypt student API.
Endpoint: http://apiaccess.iti.net.eg/api/v1/student/chat
"""

import logging
from typing import Any, Iterator, List, Optional

import requests
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult

logger = logging.getLogger(__name__)

ITI_URL = "http://apiaccess.iti.net.eg/api/v1/student/chat"


class ITIChatModel(BaseChatModel):
    """LangChain-compatible wrapper for the ITI student Bedrock API."""

    api_key: str
    model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    max_tokens: int = 2048
    temperature: float = 0.1

    @property
    def _llm_type(self) -> str:
        return "iti-bedrock"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        # Separate system prompt from conversation messages
        system_prompt = ""
        chat_messages = []

        for msg in messages:
            if isinstance(msg, SystemMessage):
                system_prompt = msg.content
            elif isinstance(msg, HumanMessage):
                chat_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                chat_messages.append({"role": "assistant", "content": msg.content})
            else:
                chat_messages.append({"role": "user", "content": msg.content})

        payload: dict = {
            "model_id": self.model_id,
            "messages": chat_messages,
            "max_tokens": self.max_tokens,
        }
        if system_prompt:
            payload["system_prompt"] = system_prompt

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }

        logger.debug("ITI API request: model=%s messages=%d", self.model_id, len(chat_messages))
        resp = requests.post(ITI_URL, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()

        data = resp.json()

        # Extract text from response — handle both possible shapes
        if "content" in data:
            text = data["content"]
        elif "message" in data:
            text = data["message"]
        elif "choices" in data:
            text = data["choices"][0]["message"]["content"]
        else:
            text = str(data)

        logger.debug("ITI API response length: %d chars", len(text))
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])
