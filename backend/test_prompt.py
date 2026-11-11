import requests

test_data = {
    'patient_name': 'Ahmed Khan',
    'chief_complaint': 'Pain in lower right molar region for the past 3 days',
    'diagnoses': ['Dental Caries', 'Periapical Abscess'],
    'procedures': ['X-ray Examination', 'Clinical Examination'],
    'prescription': 'Amoxicillin 500mg TDS for 5 days, Ibuprofen 400mg SOS for pain',
    'notes': 'Poor oral hygiene observed. Patient advised to brush twice daily and floss.',
    'follow_up': 'Review after 1 week for root canal treatment',
    'detections': [
        {'class_name': 'Caries', 'confidence': 0.92},
        {'class_name': 'Periapical Lesion', 'confidence': 0.87},
        {'class_name': 'Root Canal Treatment', 'confidence': 0.95}
    ],
    'measurements': [{'length_mm': 12.5}]
}

try:
    response = requests.post('http://localhost:8000/generate-report', json=test_data, timeout=60)
    print('Status:', response.status_code)
    print()
    print('IMPROVED REPORT:')
    print('='*70)
    print(response.json().get('report', response.json()))
except Exception as e:
    print(f"Error: {e}")
