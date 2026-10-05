from __future__ import annotations

PERSON_NAME_MAP = {
    'முருகன்': {'en': 'Murugan', 'hi': 'मुरुगन'},
    'சேலம்': {'en': 'Salem', 'hi': 'सलेम'},
    'சென்னை': {'en': 'Chennai', 'hi': 'चेन्नई'},
    'கோவை': {'en': 'Coimbatore', 'hi': 'कोयम्बटूर'},
    'மதுரை': {'en': 'Madurai', 'hi': 'मदुरै'},
}


def transliterate_name(value: str | None, output_language: str) -> str | None:
    if value is None or value == '':
        return value
    text = str(value).strip()
    if not text:
        return text
    if output_language not in {'en', 'hi'}:
        return text
    return PERSON_NAME_MAP.get(text, {}).get(output_language, text)
