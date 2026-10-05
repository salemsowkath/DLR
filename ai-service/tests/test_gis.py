from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def square_polygon() -> dict:
    return {
        'type': 'Polygon',
        'coordinates': [
            [
                [500000.0, 1300000.0],
                [500100.0, 1300000.0],
                [500100.0, 1300100.0],
                [500000.0, 1300100.0],
                [500000.0, 1300000.0],
            ]
        ],
    }


def valid_feature() -> dict:
    return {
        'type': 'Feature',
        'properties': {'survey_number': '125/3A'},
        'geometry': square_polygon(),
    }


def invalid_self_intersecting_polygon() -> dict:
    return {
        'type': 'Polygon',
        'coordinates': [
            [
                [0.0, 0.0],
                [2.0, 2.0],
                [0.0, 2.0],
                [2.0, 0.0],
                [0.0, 0.0],
            ]
        ],
    }


def test_gis_geometry_validation() -> None:
    response = client.post('/api/v1/gis/validate', json={'crs': 'EPSG:32644', 'geometry': square_polygon()})
    assert response.status_code == 200
    payload = response.json()
    assert payload['success'] is True
    assert payload['gis_validation']['geometry_valid'] is True
    assert payload['gis_validation']['boundary']['status'] == 'VALID'

    invalid = client.post('/api/v1/gis/validate', json={'crs': 'EPSG:32644', 'geometry': invalid_self_intersecting_polygon()})
    assert invalid.status_code == 200
    invalid_payload = invalid.json()
    assert invalid_payload['gis_validation']['geometry_valid'] is False
    assert invalid_payload['gis_validation']['issues']


def test_area_comparison_and_tolerance() -> None:
    response = client.post(
        '/api/v1/gis/compare-area',
        json={
            'crs': 'EPSG:32644',
            'geometry': square_polygon(),
            'document_area': {'value': 2.5, 'unit': 'acre'},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['success'] is True
    assert payload['comparison']['document_area']['unit'] == 'acre'
    assert payload['comparison']['gis_area']['unit'] == 'square_metre'
    assert payload['comparison']['classification'] in {'MATCH', 'MINOR_VARIANCE', 'SIGNIFICANT_MISMATCH'}


def test_overlap_and_relationship_detection() -> None:
    feature_collection = {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'properties': {'survey_number': '125/3A'},
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [[(0, 0), (10, 0), (10, 10), (0, 10), (0, 0)]],
                },
            },
            {
                'type': 'Feature',
                'properties': {'survey_number': '125/3B'},
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [[(5, 5), (15, 5), (15, 15), (5, 15), (5, 5)]],
                },
            },
        ],
    }
    response = client.post('/api/v1/gis/overlap', json=feature_collection)
    assert response.status_code == 200
    payload = response.json()
    assert payload['success'] is True
    assert payload['results']
    assert any(item['relationship'] in {'OVERLAP', 'TOUCHING', 'CONTAINS', 'WITHIN', 'EQUAL'} for item in payload['results'])


def test_land_record_gis_validation_and_crs_safety() -> None:
    payload = {
        'land_record': {
            'survey_number': {'value': '125/3A', 'confidence': 0.98},
            'area': {'value': '2.50 Acres', 'confidence': 0.91},
            'village': {'value': 'Salem', 'confidence': 0.95},
        },
        'geometry': square_polygon(),
        'crs': 'EPSG:32644',
    }
    response = client.post('/api/v1/gis/land-record', json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result['success'] is True
    assert result['gis_validation']['geometry_valid'] is True
    assert result['survey_number'] == '125/3A'

    geo_response = client.post('/api/v1/gis/validate', json={'crs': 'EPSG:4326', 'geometry': square_polygon()})
    payload = geo_response.json()
    assert payload['gis_validation']['area']['warning'] == 'AREA_REQUIRES_PROJECTED_CRS'


def test_geojson_feature_collection_parsing() -> None:
    collection = {
        'type': 'FeatureCollection',
        'features': [valid_feature()],
    }
    response = client.post('/api/v1/gis/validate', json={'crs': 'EPSG:32644', 'geometry': collection})
    assert response.status_code == 200
    payload = response.json()
    assert payload['gis_validation']['geometry_valid'] is True
