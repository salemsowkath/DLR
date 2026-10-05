LANGUAGE_ALIASES = {
    'eng': 'eng',
    'tam': 'tam',
    'hin': 'hin',
    'tam+eng': 'tam+eng',
    'hin+eng': 'hin+eng',
    'tam+hin': 'tam+hin',
    'tam+hin+eng': 'tam+hin+eng',
}

SUPPORTED_LANGUAGES = dict(LANGUAGE_ALIASES)


def get_supported_languages() -> dict[str, str]:
    return dict(SUPPORTED_LANGUAGES)


def normalize_language(language: str | None, default: str = 'eng') -> str:
    candidate = (language or default).strip().lower()
    if not candidate:
        candidate = default

    normalized = LANGUAGE_ALIASES.get(candidate)
    if normalized is not None:
        return normalized

    raise ValueError(
        "Unsupported language. Supported values: eng, tam, hin, tam+eng, hin+eng, tam+hin, tam+hin+eng."
    )
