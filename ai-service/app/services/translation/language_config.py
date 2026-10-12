SUPPORTED_OUTPUT_LANGUAGES = ['ta', 'en', 'hi']
LANGUAGE_ALIASES = {
    'ta': 'ta',
    'tamil': 'ta',
    'tam': 'ta',
    'en': 'en',
    'english': 'en',
    'eng': 'en',
    'hi': 'hi',
    'hindi': 'hi',
    'hin': 'hi',
}
LANGUAGE_NAMES = {
    'ta': 'Tamil',
    'en': 'English',
    'hi': 'Hindi',
}
FIELD_LABELS = {
    'owner_name': {'ta': 'உரிமையாளர் பெயர்', 'en': 'Owner Name', 'hi': 'भूमि मालिक का नाम'},
    'survey_number': {'ta': 'சர்வே எண்', 'en': 'Survey Number', 'hi': 'सर्वे नंबर'},
    'khasra_number': {'ta': 'கச்ரா எண்', 'en': 'Khasra Number', 'hi': 'खसरा नंबर'},
    'khata_number': {'ta': 'கடா எண்', 'en': 'Khata Number', 'hi': 'खाता नंबर'},
    'area': {'ta': 'நிலப்பரப்பு', 'en': 'Land Area', 'hi': 'भूमि क्षेत्रफल'},
    'land_classification': {'ta': 'நில வகைப்பாடு', 'en': 'Land Classification', 'hi': 'भूमि वर्गीकरण'},
    'village': {'ta': 'கிராமம்', 'en': 'Village', 'hi': 'गाँव'},
    'taluk': {'ta': 'தாலுகா', 'en': 'Taluk', 'hi': 'तहसील'},
    'tehsil': {'ta': 'தாலுகா', 'en': 'Tehsil', 'hi': 'तहसील'},
    'district': {'ta': 'மாவட்டம்', 'en': 'District', 'hi': 'जिला'},
    'state': {'ta': 'மாநிலம்', 'en': 'State', 'hi': 'राज्य'},
    'registration_number': {'ta': 'பதிவு எண்', 'en': 'Registration Number', 'hi': 'पंजीकरण संख्या'},
    'document_number': {'ta': 'ஆவண எண்', 'en': 'Document Number', 'hi': 'दस्तावेज़ संख्या'},
    'date': {'ta': 'ஆவண தேதி', 'en': 'Document Date', 'hi': 'दस्तावेज़ दिनांक'},
    'mutation_number': {'ta': 'பரிமாற்ற எண்', 'en': 'Mutation Number', 'hi': 'नामांतरण संख्या'},
    'patta_number': {'ta': 'பட்டா எண்', 'en': 'Patta Number', 'hi': 'पट्टा नंबर'},
    'owner': {'ta': 'உரிமையாளர்', 'en': 'Owner', 'hi': 'मालिक'},
}
PERSONAL_NAME_FIELDS = {'owner_name'}
LEGAL_IDENTIFIER_FIELDS = {
    'survey_number', 'khasra_number', 'khata_number', 'patta_number',
    'registration_number', 'document_number', 'mutation_number', 'plot_number'
}
UNIT_TRANSLATIONS = {
    'ஏக்கர்': {'en': 'Acres', 'hi': 'एकड़'},
    'acre': {'en': 'Acres', 'hi': 'एकड़'},
    'acres': {'en': 'Acres', 'hi': 'एकड़'},
    'hectare': {'en': 'Hectares', 'hi': 'हेक्टेयर'},
    'hectares': {'en': 'Hectares', 'hi': 'हेक्टेयर'},
    'சதுர அடி': {'en': 'Sq Ft', 'hi': 'वर्ग फीट'},
    'sq ft': {'en': 'Sq Ft', 'hi': 'वर्ग फीट'},
}
LAND_CLASSIFICATION_TRANSLATIONS = {
    'dry': {'ta': 'உலர்', 'en': 'Dry', 'hi': 'सूखी'},
    'wet': {'ta': 'ஈரமான', 'en': 'Wet', 'hi': 'गीली'},
    'garden': {'ta': 'தோட்டம்', 'en': 'Garden', 'hi': 'बगीचा'},
    'paddy': {'ta': 'நெல்', 'en': 'Paddy', 'hi': 'धान'},
}


def normalize_output_language(language: str | None, default: str = 'en') -> str:
    candidate = (language or default).strip().lower()
    if not candidate:
        return default
    if '+' in candidate:
        parts = [p.strip() for p in candidate.split('+')]
        for p in parts:
            if p in LANGUAGE_ALIASES:
                return LANGUAGE_ALIASES[p]
        return default
    normalized = LANGUAGE_ALIASES.get(candidate)
    if normalized is not None:
        return normalized
    raise ValueError('Unsupported language. Supported languages are Tamil, English and Hindi.')

