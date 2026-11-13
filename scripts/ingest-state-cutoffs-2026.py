import os
import sys
import csv
import json
import shutil
from collections import defaultdict

DRY_RUN = '--dry-run' in sys.argv

print(f"=== INGESTING 2026 ROUND 1 CUTOFFS FOR 6 STATES {'(DRY RUN)' if DRY_RUN else '(LIVE)'} ===")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW = os.path.join(BASE_DIR, 'data', 'raw')
BACKUP_DIR = os.path.join(BASE_DIR, 'data', 'backups', 'pre_2026_cutoffs_backup')
PROCESSED_COURSES = os.path.join(BASE_DIR, 'data', 'processed', 'courses.json')
PROCESSED_INSTS = os.path.join(BASE_DIR, 'data', 'processed', 'institutes.json')

with open(PROCESSED_COURSES) as f:
    ALL_COURSES = {c['id']: c for c in json.load(f)}

with open(PROCESSED_INSTS) as f:
    ALL_INSTS = {i['id']: i for i in json.load(f)}

# Find current max option ID across all raw files to safely allocate new IDs
max_option_id = 880208
for fname in os.listdir(DATA_RAW):
    if fname.endswith('.json') and not 'seat_matrix' in fname:
        try:
            with open(os.path.join(DATA_RAW, fname)) as fp:
                d = json.load(fp)
                if isinstance(d, list):
                    for x in d:
                        if isinstance(x.get('id'), int) and x['id'] > max_option_id:
                            max_option_id = x['id']
        except Exception:
            pass

print(f"Current Max Option ID: {max_option_id}")

def allocate_id():
    global max_option_id
    max_option_id += 1
    return max_option_id


# ==============================================================================
# STATE 1: KARNATAKA
# ==============================================================================
def process_karnataka():
    print("\n----------------------------------------")
    print("Processing State: Karnataka")
    print("----------------------------------------")
    
    csv_path = os.path.join(DATA_RAW, 'cutoffs_karnataka_round_1_2026.csv')
    json_path = os.path.join(DATA_RAW, 'Karnataka.json')
    
    COLLEGES = {
        'A J Institute of Medical Sciences & Research Centre, Mangalore': 137,
        'Adichunchanagiri Institute of Medical Sciences, Bellur': 128,
        'Akash Institute of Medical Sciences & Research Centre, Devanhalli, Bangalore, Karnataka': 173,
        'Al-Ameen Medical College, Bijapur': 129,
        'BGS Global Institute of Medical Sciences, Bangalore': 183,
        'Bangalore Medical College and Research Institute, Bangalore': 110,
        'Basaveswara Medical College and Hospital, Chitradurga': 184,
        'Belagavi Institute of Medical Sciences, Belagavi': 176,
        'Bidar Institute of Medical Sciences, Bidar': 189,
        'Chamrajanagar Institute of Medical Sciences, Karnataka': 1935,
        'Chikkamagaluru Institute of Medical Sciences, Chikkamagaluru': 6126,
        'Dharwad Institute of Mental Health and Neuro Sciences, Dharwad': 185,
        'Dr BR Ambedkar Medical College, Bangalore': 121,
        'Dr. Chandramma Dayananda Sagar Instt. of Medical Education & Research, Harohalli, Hubli': 5344,
        'East Point College of Medical Sciences & Research Centre, Bangalore': 3032,
        'Employees State Insurance Corporation Medical College, Bangalore': 191,
        'Employees State Insurance Corporation Medical College, Gulbarga': 1334,
        'Father Mullers Medical College, Mangalore': 120,
        'Gulbarga Institute of Medical Sciences, Gulbarga': 1335,
        'Hassan Institute of Medical Sciences, Hassan': 179,
        'Haveri Institute of Medical Sciences, Haveri': 6127,
        'Indira Gandhi Institute of Child Health, Bangalore': 131,
        'JJM Medical College, Davangere': 124,
        'JSS Medical College, Mysore': 125,
        'K S Hegde Medical Academy, Mangalore': 132,
        'K V G Medical College, Sullia': 139,
        'K.H. Patil Institute of Medical Sciences (previously Gadag Institute of Medical Sciences, Mallasamudra, Mulgund Road, Gadag)': 175,
        'Kanachur Institute of Medical Sciences, Mangalore': 1336,
        'Karnataka Medical College and Research Institute, Hubballi, Karnataka': 116,
        'Karwar Institute of Medical Sciences, Karwar': 1936,
        'Kasturba Medical College, Mangalore': 111,
        'Kasturba Medical College, Manipal': 107,
        'Kempegowda Institute of Medical Sciences, Bangalore': 126,
        'Khaja Bandanawaz University - Faculty of Medical Sciences, Gulbarga': 187,
        'Kidwai Memorial Institute of Oncology, Bangalore': 172,
        'Kodagu Institute of Medical Sciences, Kodagu': 1934,
        'Koppal Institute of Medical Sciences, Koppal': 1362,
        'M S Ramaiah Medical College, Bangalore': 118,
        'MVJ Medical College and Research Hospital, Bangalore': 140,
        'Mahadevappa Rampure Medical College, Kalaburagi, Gulbarga': 122,
        'Mandya Institute of Medical Sciences, Mandya': 181,
        'Mysore Medical College and Research Instt. (Prev.name Government Medical College), Mysore': 106,
        'Nandi Medical College and Research Institute Chikkaballapura (Chikkaballapura Institute of Medical Sciences Chikkaballapura )': 6125,
        'Navodaya Medical College, Raichur': 138,
        'Raichur Institute of Medical Sciences, Raichur': 130,
        'S S Institute of Medical Sciences& Research Centre, Davangere': 188,
        'S. Nijalingappa Medical College & HSK Hospital & Research Centre, Bagalkot': 134,
        'SDM College of Medical Sciences & Hospital, Sattur, Dharwad': 109,
        'SDS Tuberculosis Research Centre and Rajiv Gandhi Institute of Chest Diseases, Bangalore': 180,
        'Sanjay Gandhi Institute of Trauma and Orthopaedics, Bangalore': 190,
        'Sapthagiri Institute of Medical Sciences & Research Centre, Bangalore': 186,
        'Shimoga Institute of Medical Sciences, Shimoga': 178,
        'Shri Atal Bihari Vajpayee Medical College & Research Institute': 3432,
        'Shri B M Patil Medical College, Hospital & Research Centre, Vijayapura (Bijapur': 115,
        'Shridevi Institute of Medical Sciences & Research Hospital, Tumkur': 174,
        'Siddaganga Medical College and Research Institute, Tumakuru': 6353,
        'Sri Chamundeshwari Medical College Hospital & Research Institute': 6354,
        'Sri Madhusudan Sai Institute of Medical Sciences & Research, Chikballapur': 6355,
        'Srinivas Institute of Medical Research Centre, Srinivasnagar, Mangalore': 182,
        'St. Johns Medical College, Bangalore': 123,
        'Subbaiah Institute of Medical Sciences, Shimoga, Karnataka': 1337,
        'The Oxford Medical College, Hospital & Research Centre, Bangalore': 177,
        'Vijaynagar Institute of Medical Sciences, Bellary': 108,
        'Vydehi Institute Of Medical Sciences & Research Centre, Bangalore': 136,
        'Yenepoya Medical College, Mangalore': 114
    }
    
    COURSES = {
        'Diploma in Clinical Pathology': 4,
        'Diploma in Public Health': 24,
        'Diploma in TB and Chest Diseases': 30,
        'M.D Emergency Medicine': 43,
        'M.D Geritrics': 47,
        'M.D Hospital Administration': 48,
        'M.D Immuno Haemotology': 49,
        'M.D. Anaesthesia': 32,
        'M.D. Anatomy': 34,
        'M.D. Biochemistry': 37,
        'M.D. Community Medicine': 63,
        'M.D. Dermatology': 42,
        'M.D. Family Medicine': 44,
        'M.D. Forensic Medicine': 45,
        'M.D. General Medicine': 46,
        'M.D. Microbiology': 51,
        'M.D. Paediatrics': 53,
        'M.D. Pathology': 55,
        'M.D. Pharmacology': 57,
        'M.D. Physical and Rehablitation': 58,
        'M.D. Physiology': 59,
        'M.D. Psychiatry': 60,
        'M.D. Radio Diagnosis': 62,
        'M.D. Radio Therapy': 61,
        'M.D. Respiratory Medicine': 67,
        'M.S. ENT': 68,
        'M.S. General Surgery': 69,
        'M.S. Obstetrics and Gynecology': 70,
        'M.S. Opthalamology': 71,
        'M.S. Orthopedics': 72
    }
    
    QUOTA_TEMPLATES = {
        28: {'id': 28, 'name': 'Karnataka Govt Quota - Open', 'short_name': 'KAR Govt Quota-Open', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Karnataka Govt Quota'},
        29: {'id': 29, 'name': 'Karnataka Private Seats - Open Quota', 'short_name': 'KAR Priv Seats-Open', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Karnataka Private Seats'},
        30: {'id': 30, 'name': 'Karnataka Private Seats - Minority Quota', 'short_name': 'KAR Priv Seats-Min.', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Karnataka Private Seats'},
        31: {'id': 31, 'name': 'Karnataka Private Seats - GMP Quota', 'short_name': 'KAR Priv Seats-GMP', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Karnataka Private Seats'},
        32: {'id': 32, 'name': 'Karnataka Other Seats (Institutional Quota)', 'short_name': 'KAR Others (Inst.Q)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Karnataka Other Seats (Institutional Quota)'},
        33: {'id': 33, 'name': 'Karnataka NRI Quota', 'short_name': 'KAR NRI Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Karnataka NRI Quota'},
        188: {'id': 188, 'name': 'Karnataka Private Seats - PWD Quota', 'short_name': 'KAR Priv Seats-PWD', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Karnataka Private Seats'},
        189: {'id': 189, 'name': 'Karnataka Govt Quota - Minority Quota', 'short_name': 'KAR Govt Quota-Min.', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Karnataka Govt Quota'},
    }
    
    with open(json_path) as fp:
        raw_data = json.load(fp)
    
    # Map key -> option
    lookup = {}
    inst_samples = {}
    for item in raw_data:
        k = (item['institute']['id'], item['course']['id'], item['quota']['id'], item['category'])
        lookup[k] = item
        if item['institute']['id'] not in inst_samples:
            inst_samples[item['institute']['id']] = item
            
    with open(csv_path) as fp:
        rows = list(csv.DictReader(fp))
        
    print(f"Karnataka existing options: {len(raw_data)}, CSV rows: {len(rows)}")
    
    # Group ranks by (inst_id, course_id, quota_id, category)
    grouped = defaultdict(list)
    for r in rows:
        inst_id = COLLEGES[r['college']]
        course_id = COURSES[r['specialization']]
        cat = r['category']
        q_raw = r['quota']
        
        # Category transforms
        if cat == 'MC': cat = 'MC1'
        elif cat == 'MM': cat = 'MM1'
        elif cat == 'MMH': cat = 'MMH1'
        
        # Quota mapping
        if q_raw == 'Management Quota':
            q_id = 32 if cat == 'MNG' else 33
        elif q_raw == 'Private Quota':
            if cat == 'OPN': q_id = 29
            elif cat in ('GMP', 'GMPH'): q_id = 31
            elif cat in ('PGM', 'PGMH'): q_id = 188  # New Quota
            else: q_id = 30 # Minority
        elif q_raw == 'Government Quota':
            if cat in ('RC1', 'RC2', 'RC3'): q_id = 189  # New Quota
            else: q_id = 28
        else:
            q_id = 28
            
        rank = int(r['ai_closing_rank']) if r['ai_closing_rank'] else None
        grouped[(inst_id, course_id, q_id, cat)].append(rank)
        
    matched_count = 0
    new_count = 0
    
    for (inst_id, course_id, q_id, cat), ranks in grouped.items():
        valid_ranks = [rk for rk in ranks if rk is not None]
        closing_rank = max(valid_ranks) if valid_ranks else None
        allotments_count = len(valid_ranks) if valid_ranks else 1
        
        cr_2026_1 = {
            'value': f"{closing_rank}({allotments_count})" if closing_rank else None,
            'session': '2026',
            'round': '1',
            'closing_rank': closing_rank,
            'counselling_rank': closing_rank,
            'ai_rank': closing_rank,
            'allotments_count': allotments_count,
            'inservice_candidate': False,
            'candidate_flag': None
        }
        
        key = (inst_id, course_id, q_id, cat)
        if key in lookup:
            lookup[key]['cr_2026_1'] = cr_2026_1
            matched_count += 1
        else:
            sample = inst_samples.get(inst_id)
            inst_obj = sample['institute'] if sample else ALL_INSTS.get(inst_id, {'id': inst_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            course_obj = sample['course'] if (sample and sample['course']['id'] == course_id) else ALL_COURSES.get(course_id, {'id': course_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            quota_obj = QUOTA_TEMPLATES[q_id]
            
            new_opt = {
                'id': allocate_id(),
                'state': 'Karnataka',
                'institute': {
                    'id': inst_obj['id'],
                    'name': inst_obj['name'],
                    'short_name': inst_obj.get('short_name', inst_obj['name'][:35]),
                    'logo_url': inst_obj.get('logo_url'),
                    'district': inst_obj.get('district')
                },
                'course': {
                    'id': course_obj['id'],
                    'name': course_obj['name'],
                    'short_name': course_obj.get('short_name', course_obj['name'][:25])
                },
                'quota': quota_obj,
                'category': cat,
                'counselling': {'id': 15, 'name': 'Karnataka - PG Medical', 'short_name': 'KAR PG (KEA)'},
                'cr_2026_1': cr_2026_1,
                'fee_id': sample.get('fee_id') if sample else None,
                'fee': sample.get('fee') if sample else None,
                'stipend_year_1': sample.get('stipend_year_1') if sample else None,
                'bond_years': sample.get('bond_years') if sample else None,
                'bond_penalty': sample.get('bond_penalty') if sample else None,
                'beds': sample.get('beds') if sample else None,
                'choice_list_count': 0
            }
            raw_data.append(new_opt)
            lookup[key] = new_opt
            new_count += 1
            
    print(f"Karnataka matched existing choices: {matched_count}, new choices added: {new_count}")
    print(f"Karnataka total choices now: {len(raw_data)}")
    
    if not DRY_RUN:
        with open(json_path, 'w') as fp:
            json.dump(raw_data, fp, indent=2)
        print(f"Saved {json_path}")


# ==============================================================================
# STATE 2: MADHYA PRADESH
# ==============================================================================
def process_mp():
    print("\n----------------------------------------")
    print("Processing State: Madhya Pradesh")
    print("----------------------------------------")
    
    csv_path = os.path.join(DATA_RAW, 'cutoffs_mp_round_1_2026.csv')
    json_path = os.path.join(DATA_RAW, 'Madhya Pradesh.json')
    
    COLLEGES = {
        'AMALTAS INSTITUTE OF MEDICAL SCIENCES DEWAS': 1343,
        'ATAL BIHARI VAJPAYEE GOVERNMENT MEDICAL COLLEGE VIDISHA': 3421,
        'BIRSA MUNDA GOVERNMENT MEDICAL COLLEGE SHAHDOL': 5335,
        'BUNDELKHAND MEDICAL COLLEGE SAGAR': 192,
        'CHHINDWARA INSTITUTE OF MEDICAL SCIENCES CHHINDWARA': 6129,
        'CHIRAYU MEDICAL COLLEGE AND HOSPITAL BHOPAL': 193,
        'Dr. Laxminarayan Pandey Government Medical College, Ratlam': 1943,
        'GAJRA RAJA MEDICAL COLLEGE GWALIOR': 168,
        'GANDHI MEDICAL COLLEGE BHOPAL': 166,
        'GOVERMENT MEDICAL COLLEGE SATNA': 6130,
        'GOVERNMENT MEDICAL COLLEGE DATIA': 3024,
        'GWALIOR MANSIK AROGYSHALA GWALIOR': 3153,
        'INDEX MEDICAL COLLEGE HOSPITAL AND RESEARCH CENTER INDORE': 195,
        'LN MEDICAL COLLEGE BHOPAL': 194,
        'LNCT MEDICAL COLLEGE & SEWAKUNJ HOSPITAL, INDORE': 6356,
        'MAHATMA GANDHI MEMORIAL MEDICAL COLLEGE INDORE': 167,
        'MAHAVEER INSTITUTE OF MEDICAL SCIENCE AND RESEARCH BHOPAL': 6357,
        'NANDKUMAR SINGH CHOUHAN GOVERNMENT MEDICAL COLLEGE KHANDWA': 3427,
        'NETAJI SUBHASH CHANDRA BOSE MEDICAL COLLEGE JABALPUR': 170,
        'PEOPLES COLLEGE OF MEDICAL SCIENCE BHOPAL': 169,
        'RAM KRISHNA MEDICAL COLLEGE HOSPITAL AND RESEARCH CENTRE, BHOPAL': 6358,
        'RD GARDI MEDICAL COLLEGE UJJAIN': 196,
        'RKDF MEDICAL COLLEGE HOSPITAL AND RESEARCH CENTRE BHOPAL': 3029,
        'SHRIMANT RAJMATA VIJAYARAJE SCINDIA MEDICAL COLLEGE SHIVPURI': 5331,
        'SHYAM SHAH MEDICAL COLLEGE REWA': 171,
        'SRI AUROBINDO INSTITUTE OF MEDICAL SCIENCE INDORE': 197,
        'SUKH SAGAR MEDICAL COLLEGE AND HOSPITAL JABALPUR': 6359,
        'Civil Hospital Jabalpur': 5171,
        'DH Bhopal': 829,
        'DH Guna': 3513,
        'DH Gwalior': 3087,
        'DH Rewa': 3535,
        'DH Sagar': 3089,
        'DH Satna': 1419,
        'DH Shivpuri': 6211,
        'DH Vidisha': 3649,
        'District Hospital Bhopal': 829
    }
    
    COURSES = {
        'MD - ANAESTHESIOLOGY': 32,
        'MD - BIOCHEMISTRY': 37,
        'MD - COMMUNITY MEDICINE': 63,
        'MD - DERMATOLOGY VENEREOLOGY AND LEPROSY': 42,
        'MD - EMERGENCY MEDICINE': 43,
        'MD - FORENSIC MEDICINE AND TOXICOLOGY': 45,
        'MD - GENERAL MEDICINE': 46,
        'MD - IMMUNO HAEMATOLOGY AND BLOOD TRANSFUSION': 49,
        'MD - MICROBIOLOGY': 51,
        'MD - PAEDIATRICS': 53,
        'MD - PATHOLOGY': 55,
        'MD - PHARMACOLOGY': 57,
        'MD - PHYSIOLOGY': 59,
        'MD - PSYCHIATRY': 60,
        'MD - RADIATION ONCOLOGY': 61,
        'MD - RADIODIAGNOSIS': 62,
        'MD - RESPIRATORY MEDICINE': 67,
        'MS - ANATOMY': 34,
        'MS - GENERAL SURGERY': 69,
        'MS - OBSTETRICS AND GYNAECOLOGY': 70,
        'MS - OPHTHALMOLOGY': 71,
        'MS - ORTHOPAEDICS': 72,
        'MS - OTORHINOLARYNGOLOGY (ENT)': 68,
        'POST MBBS DNB - Paediatrics': 97,
        'POST MBBS PG DIP - Anesthesiology': 146,
        'POST MBBS PG DIP - OBGY': 149,
        'POST MBBS PG DIP - Paediatrics': 151
    }
    
    PRIVATE_INSTS = {1343, 193, 194, 195, 196, 197, 3029, 6356, 6357, 6358, 6359}
    
    QUOTA_TEMPLATES = {
        64: {'id': 64, 'name': 'MP Govt Quota', 'short_name': 'MP Govt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'MP Govt Quota'},
        8064: {'id': 8064, 'name': 'MP Govt Quota (In-Service)', 'short_name': 'MP Govt Quota (In-Service)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'MP Govt Quota'},
        65: {'id': 65, 'name': 'MP Private Seats - Open Quota', 'short_name': 'MP Priv-Open Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'MP Private Seats'},
        8065: {'id': 8065, 'name': 'MP Private Seats - Open Quota (In-Service)', 'short_name': 'MP Priv-Open Quota (In-Service)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'MP Private Seats'},
        66: {'id': 66, 'name': 'MP Private Seats - NRI Quota', 'short_name': 'MP Priv-NRI Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'MP Private Seats'}
    }
    
    with open(json_path) as fp:
        raw_data = json.load(fp)
        
    lookup = {}
    inst_samples = {}
    for item in raw_data:
        k = (item['institute']['id'], item['course']['id'], item['quota']['id'], item['category'])
        lookup[k] = item
        if item['institute']['id'] not in inst_samples:
            inst_samples[item['institute']['id']] = item
            
    with open(csv_path) as fp:
        rows = list(csv.DictReader(fp))
        
    print(f"MP existing options: {len(raw_data)}, CSV rows: {len(rows)}")
    
    grouped = defaultdict(list)
    for r in rows:
        inst_id = COLLEGES[r['college']]
        course_id = COURSES[r['specialization']]
        is_govt = inst_id not in PRIVATE_INSTS
        quota_code = r['quota']
        
        if quota_code.startswith('IN_'):
            q_id = 8064 if is_govt else 8065
            cat = quota_code.replace('IN_', '')
            flag = 'inservice_candidate'
            is_inservice = True
        elif quota_code == 'INST/UR/NRI/OP':
            q_id = 66
            cat = 'UR/NRI/OP'
            flag = None
            is_inservice = False
        elif quota_code.startswith('INST/'):
            q_id = 64 if is_govt else 65
            cat = quota_code.replace('INST/', '')
            flag = 'mp_institutional_seat'
            is_inservice = False
        elif quota_code.startswith('NON_INST/'):
            q_id = 64 if is_govt else 65
            cat = quota_code.replace('NON_INST/', '')
            flag = 'mp_non_institutional_seat'
            is_inservice = False
        else:
            q_id = 64 if is_govt else 65
            cat = quota_code
            flag = None
            is_inservice = False
            
        s_rank = int(r['state_closing_rank']) if r['state_closing_rank'] else None
        ai_rank = int(r['ai_closing_rank']) if r['ai_closing_rank'] else None
        grouped[(inst_id, course_id, q_id, cat, flag, is_inservice)].append((s_rank, ai_rank))
        
    matched_count = 0
    new_count = 0
    
    for (inst_id, course_id, q_id, cat, flag, is_inservice), ranks in grouped.items():
        state_ranks = [rk[0] for rk in ranks if rk[0] is not None]
        ai_ranks = [rk[1] for rk in ranks if rk[1] is not None]
        closing_rank = max(state_ranks) if state_ranks else None
        ai_closing_rank = max(ai_ranks) if ai_ranks else None
        allotments_count = len(state_ranks) if state_ranks else 1
        
        cr_2026_1 = {
            'value': f"{closing_rank}({allotments_count})" if closing_rank else None,
            'session': '2026',
            'round': '1',
            'closing_rank': closing_rank,
            'counselling_rank': closing_rank,
            'ai_rank': ai_closing_rank,
            'allotments_count': allotments_count,
            'inservice_candidate': is_inservice,
            'candidate_flag': flag
        }
        
        key = (inst_id, course_id, q_id, cat)
        if key in lookup:
            lookup[key]['cr_2026_1'] = cr_2026_1
            matched_count += 1
        else:
            sample = inst_samples.get(inst_id)
            inst_obj = sample['institute'] if sample else ALL_INSTS.get(inst_id, {'id': inst_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            course_obj = sample['course'] if (sample and sample['course']['id'] == course_id) else ALL_COURSES.get(course_id, {'id': course_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            quota_obj = QUOTA_TEMPLATES[q_id]
            
            new_opt = {
                'id': allocate_id(),
                'state': 'Madhya Pradesh',
                'institute': {
                    'id': inst_obj['id'],
                    'name': inst_obj['name'],
                    'short_name': inst_obj.get('short_name', inst_obj['name'][:35]),
                    'logo_url': inst_obj.get('logo_url'),
                    'district': inst_obj.get('district')
                },
                'course': {
                    'id': course_obj['id'],
                    'name': course_obj['name'],
                    'short_name': course_obj.get('short_name', course_obj['name'][:25])
                },
                'quota': quota_obj,
                'category': cat,
                'counselling': {'id': 17, 'name': 'Madhya Pradesh - PG Medical', 'short_name': 'MP PG'},
                'cr_2026_1': cr_2026_1,
                'fee_id': sample.get('fee_id') if sample else None,
                'fee': sample.get('fee') if sample else None,
                'stipend_year_1': sample.get('stipend_year_1') if sample else None,
                'bond_years': sample.get('bond_years') if sample else None,
                'bond_penalty': sample.get('bond_penalty') if sample else None,
                'beds': sample.get('beds') if sample else None,
                'choice_list_count': 0
            }
            raw_data.append(new_opt)
            lookup[key] = new_opt
            new_count += 1
            
    print(f"MP matched existing choices: {matched_count}, new choices added: {new_count}")
    print(f"MP total choices now: {len(raw_data)}")
    
    if not DRY_RUN:
        with open(json_path, 'w') as fp:
            json.dump(raw_data, fp, indent=2)
        print(f"Saved {json_path}")


# ==============================================================================
# STATE 3: MAHARASHTRA
# ==============================================================================
def process_maharashtra():
    print("\n----------------------------------------")
    print("Processing State: Maharashtra")
    print("----------------------------------------")
    
    csv_path = os.path.join(DATA_RAW, 'cutoffs_maharashtra_round_1_2026.csv')
    json_path = os.path.join(DATA_RAW, 'Maharashtra.json')
    
    COLLEGES = {
        'ACPM DHULE': 234, 'AIIPMR MUMBAI': 253, 'ASHWINI ME SOLAPUR': 245, 'B Hire DHULE': 238, 'BARC MUMBAI': 224,
        'BHMS MUMBAI': 217, 'BJMC PUNE': 200, 'BK WALAWAL RATNAGIRI': 241, 'CGMC CHANDRAPUR': 3151, 'DNY TASGAO KARJAT': 6360,
        'DR R GODE AMARAVATI': 6417, 'GGMC GONDIA': 3023, 'GMC AKOLA': 237, 'GMC BARAMATI': 3423, 'GMC JALGAON': 3022,
        'GMC KOLHAPUR': 1363, 'GMC LATUR': 229, 'GMC MIRAJ': 199, 'GMC MUMBAI': 206, 'GMC NAGPUR': 207,
        'GMC NANDED': 204, 'GMC NANDURBAR': 6131, 'GMC SAMBHAJINA': 220, 'GSMC MUMBAI': 205, 'HBT & COOP JUHU, MUMB': 243,
        'IGMC NAGPUR': 225, 'IIMSR JALNA': 239, 'KJMC MUMBAI': 235, 'LTMC MUMBAI': 210, 'MGIMS SEVAGRAM,W': 208,
        'MIMER TALEGAON P': 250, 'MIMSR LATUR': 231, 'MPGIMER NASHIK': 3020, 'NKP Salve NAGPUR': 219, 'PCMC PGM I PIMPARI, P': 242,
        'PDMC AMRAVATI': 252, 'PGIMS NEW MUMBAI': 5352, 'PIMS ISLAMPUR,S': 5350, 'Rajeev Gan THANE': 246, 'SANCHETI PUNE': 233,
        'SANJEEVAN MIRAJ': 227, 'SKN PUNE': 232, 'SMBT NANDIHILLS': 244, 'SRTR AMBAJOGAI': 222, 'SWASTHIYOG MIRAJ': 216,
        'TATA MUMBAI': 230, 'TERNA NEW MUMBAI': 249, 'TNMC MUMBAI': 212, 'UPMC JALGAON': 240, 'VEDANTA MC PALGHAR': 3034,
        'VMMC SOLAPUR': 209, 'VNMC YEOTMAL': 198, 'VPS NASIK': 248, 'VVPF AHMEDNAGAR': 228
    }
    
    COURSES = {
        'ANAESTHESIA': 32, 'ANATOMY': 34, 'BIOCHEMISTRY': 37, 'CHEST & TB': 67, 'D.A.': 1,
        'D.C.H.': 3, 'D.G.O.': 18, 'D.M.R.D.': 27, 'D.O.R.L.': 21, 'D.P.M.': 23,
        'E.N.T.': 68, 'EMERGENCY & CRITICAL': 43, 'FORENSIC MEDICINE': 45, 'GERIATRIC': 47, 'IMMUNOLOGY HAEMATOLO': 49,
        'MEDICINE': 46, 'MICROBIOLOGY': 51, 'NUCLEAR MEDICINE': 52, 'OBGY': 70, 'OPTHALMOLOGY': 71,
        'ORTHOPEDICS': 72, 'P.S.M.': 63, 'PAEDIATRIC': 53, 'PALLIATIVE MEDICINE': 54, 'PATHOLOGY': 55,
        'PHARMACOLOGY': 57, 'PHYSICAL MEDICINE &': 58, 'PHYSIOLOGY': 59, 'PSYCHIATRY': 60, 'RADIOLOGY': 62,
        'RADIOTHERAPY': 61, 'SKIN & VD': 42, 'SURGERY': 69
    }
    
    QUOTA_TEMPLATES = {
        67: {'id': 67, 'name': 'Maharashtra Govt Quota', 'short_name': 'MAHA-Govt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Maharashtra Govt Quota'},
        68: {'id': 68, 'name': 'Maharashtra Minority Quota', 'short_name': 'MAHA-Min. Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Maharashtra Institutional Quota'},
        69: {'id': 69, 'name': 'Maharashtra Management Quota', 'short_name': 'MAHA-Mgmt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Maharashtra Institutional Quota'},
        70: {'id': 70, 'name': 'Maharashtra NRI Quota', 'short_name': 'MAHA-NRI Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Maharashtra Institutional Quota'}
    }
    
    CAT_MAP = {
        'OPEN': 'OPEN', 'OBC': 'OBC', 'SC': 'SC', 'ST': 'ST', 'SEBC': 'SEBC', 'EWS': 'EWS',
        'VJA': 'VJ', 'NTB': 'NT1', 'NTC': 'NT2', 'NTD': 'NT3',
        'PH OPEN PH': 'OPEN-PH', 'PH OBC PH-OBC': 'OBC-PH', 'PH SC PH-SC': 'SC-PH', 'PH EWS PH-EWS': 'EWS-PH',
        'ORPHAN Orphan': 'OPEN-Orphan', 'ORPHAN-C O OrphanC-OBC': 'OBC-Orphan',
        'EMOBC': 'EMOBC', 'EMSEBC': 'EMSEBC', 'EMSC': 'EMSC', 'EMVJA': 'EMVJA', 'EMNTC': 'EMNTC'
    }
    
    with open(json_path) as fp:
        raw_data = json.load(fp)
        
    lookup = {}
    inst_samples = {}
    for item in raw_data:
        k = (item['institute']['id'], item['course']['id'], item['quota']['id'], item['category'])
        lookup[k] = item
        if item['institute']['id'] not in inst_samples:
            inst_samples[item['institute']['id']] = item
            
    with open(csv_path) as fp:
        rows = list(csv.DictReader(fp))
        
    print(f"Maharashtra existing options: {len(raw_data)}, CSV rows: {len(rows)}")
    
    grouped = defaultdict(list)
    for r in rows:
        inst_id = COLLEGES[r['college']]
        course_id = COURSES[r['specialization']]
        q_raw = r['quota']
        c_raw = r['category']
        
        if q_raw == 'Institutional Quota':
            q_id = 69
            cat = 'MGT'
        elif q_raw == 'NRI Quota':
            q_id = 70
            cat = 'NRI'
        else: # State Quota
            if c_raw == 'MINORITY (Minority)':
                q_id = 68
                cat = 'Minority'
            else:
                q_id = 67
                cat = CAT_MAP.get(c_raw, c_raw)
                
        rank = int(r['state_closing_rank']) if r['state_closing_rank'] else None
        grouped[(inst_id, course_id, q_id, cat)].append(rank)
        
    matched_count = 0
    new_count = 0
    
    for (inst_id, course_id, q_id, cat), ranks in grouped.items():
        valid_ranks = [rk for rk in ranks if rk is not None]
        closing_rank = max(valid_ranks) if valid_ranks else None
        allotments_count = len(valid_ranks) if valid_ranks else 1
        
        cr_2026_1 = {
            'value': f"{closing_rank}({allotments_count})" if closing_rank else None,
            'session': '2026',
            'round': '1',
            'closing_rank': closing_rank,
            'counselling_rank': closing_rank,
            'ai_rank': None,
            'allotments_count': allotments_count,
            'inservice_candidate': False,
            'candidate_flag': None
        }
        
        key = (inst_id, course_id, q_id, cat)
        if key in lookup:
            lookup[key]['cr_2026_1'] = cr_2026_1
            matched_count += 1
        else:
            sample = inst_samples.get(inst_id)
            inst_obj = sample['institute'] if sample else ALL_INSTS.get(inst_id, {'id': inst_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            course_obj = sample['course'] if (sample and sample['course']['id'] == course_id) else ALL_COURSES.get(course_id, {'id': course_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            quota_obj = QUOTA_TEMPLATES[q_id]
            
            new_opt = {
                'id': allocate_id(),
                'state': 'Maharashtra',
                'institute': {
                    'id': inst_obj['id'],
                    'name': inst_obj['name'],
                    'short_name': inst_obj.get('short_name', inst_obj['name'][:35]),
                    'logo_url': inst_obj.get('logo_url'),
                    'district': inst_obj.get('district')
                },
                'course': {
                    'id': course_obj['id'],
                    'name': course_obj['name'],
                    'short_name': course_obj.get('short_name', course_obj['name'][:25])
                },
                'quota': quota_obj,
                'category': cat,
                'counselling': {'id': 18, 'name': 'Maharashtra - PG Medical', 'short_name': 'Maharashtra PG'},
                'cr_2026_1': cr_2026_1,
                'fee_id': sample.get('fee_id') if sample else None,
                'fee': sample.get('fee') if sample else None,
                'stipend_year_1': sample.get('stipend_year_1') if sample else None,
                'bond_years': sample.get('bond_years') if sample else None,
                'bond_penalty': sample.get('bond_penalty') if sample else None,
                'beds': sample.get('beds') if sample else None,
                'choice_list_count': 0
            }
            raw_data.append(new_opt)
            lookup[key] = new_opt
            new_count += 1
            
    print(f"Maharashtra matched existing choices: {matched_count}, new choices added: {new_count}")
    print(f"Maharashtra total choices now: {len(raw_data)}")
    
    if not DRY_RUN:
        with open(json_path, 'w') as fp:
            json.dump(raw_data, fp, indent=2)
        print(f"Saved {json_path}")


# ==============================================================================
# STATE 4: RAJASTHAN
# ==============================================================================
def process_rajasthan():
    print("\n----------------------------------------")
    print("Processing State: Rajasthan")
    print("----------------------------------------")
    
    csv_path = os.path.join(DATA_RAW, 'cutoffs_rajasthan_round_1_2026.csv')
    json_path = os.path.join(DATA_RAW, 'Rajasthan.json')
    
    def clean(s):
        return s.lower().replace('.', '').replace(',', '').replace('&', 'and').replace(' ', '').replace('government', 'govt').strip()

    COLLEGES = {
        clean('American International Institute of Medical Sciences, Bedwas'): 1345,
        clean('Ananta Institute of Medical Sciences & Research Centre, Rajsamand'): 1346,
        clean('DH Pratapgarh'): 630,
        clean('District Hospital Dholpur'): 622,
        clean('Dr S S Tantia Medical College Hospital & Research Centre, Sri Ganganagar'): 5749,
        clean('Dr SN Medical College, Jodhpur'): 287,
        clean('Employees State Insurance Corporation Medical College, Alwar'): 6136,
        clean('GH Barmer'): 754,
        clean('GH Sawai Madhopur'): 742,
        clean('GH Sirohi'): 629,
        clean('GMC & Assoc. Hosp. Dungarpur'): 761,
        clean('GMC Bharatpur'): 3424,
        clean('Geetanjali Medical College & Hospital, Udaipur'): 294,
        clean('Government Medical College, Bharatpur'): 3424,
        clean('Government Medical College, Bhilwara'): 3445,
        clean('Government Medical College, Churu'): 3425,
        clean('Government Medical College, Dungarpur'): 3426,
        clean('Government Medical College, Kota'): 285,
        clean('Government Medical College, Pali'): 3428,
        clean('Govt Amrit Kaur Hosp Beawar Dist Ajmer'): 769,
        clean('Govt BDK Hosp Jhunjhunu'): 770,
        clean('Govt DH Bundi'): 730,
        clean('Govt DH Kekri'): 1437,
        clean('Govt Dist Saadat Hosp. Tonk'): 1438,
        clean('Govt Dist civil Hospital Sri Ganganagar'): 772,
        clean('Govt Mahatma Gandhi DH Banswara'): 773,
        clean('Govt. DB General DH Churu'): 771,
        clean('Govt. RDBP Jaipuria Hospital, Jaipur'): 777,
        clean('JLN Govt Dist. Hosp. Nagaur'): 838,
        clean('Jaipur National University Institute of Medical Sciences and Research Centre, Jaipur'): 292,
        clean('Jawaharlal Nehru Medical College, Ajmer'): 288,
        clean('Jhalawar Medical College, Jhalawar'): 286,
        clean('MGH Govt DH Hanumangarh Town'): 964,
        clean('Mahatma Gandhi Hospital, Bhilwara'): 922,
        clean('Mahatma Gandhi Medical College and Hospital, Sitapura, Jaipur'): 289,
        clean('National Institute of Medical Sciences & Research (NIMS), Jaipur'): 295,
        clean('Pacific Institute of Medical Sciences, Umarda, Udaipur'): 290,
        clean('Pacific Medical College & Hospital, Bhilo Ka Bedla, Udaipur'): 291,
        clean('R N T Medical College, Udaipur'): 282,
        clean('RK Govt District Hospital Rajsamand'): 1049,
        clean('RUHS College of Medical Sciences, Jaipur'): 293,
        clean('Rajiv Gandhi Govt. GH Alwar'): 1065,
        clean('SK Hospital Sikar'): 1087,
        clean('SMS Medical College, Jaipur'): 284,
        clean('SSG Govt DH Chittorgarh'): 1186,
        clean('Sardar Patel Medical College, Bikaner'): 283
    }
    
    COURSES = {
        'MD (Anaesthesiology)': 32, 'MD (Anatomy)': 34, 'MD (Biochemistry)': 37, 'MD (Emergency Medicine)': 43,
        'MD (Family Medicine)': 44, 'MD (Forensic Medicine)': 45, 'MD (General Medicine)': 46,
        'MD (Geriatrics/Geriatric Medicine)': 47, 'MD (Hospital Administration)': 48,
        'MD (Immunohaematology & Blood Transfusion/ Transfusion Medicine)': 49, 'MD (Microbiology)': 51,
        'MD (Nuclear Medicine)': 52, 'MD (Paediatrics)': 53, 'MD (Palliative Medicine)': 54,
        'MD (Pathology)': 55, 'MD (Pharmacology)': 57, 'MD (Physical Med. & Rehabilitation)': 58,
        'MD (Physiology)': 59, 'MD (Preventive & Social Medicine (PSM)/ Community Medicine)': 63,
        'MD (Psychiatry)': 60, 'MD (Radio-Diagnosis/ Radiology)': 62, 'MD (Radiotherapy/ Radiation Oncology)': 61,
        'MD (Respiratory Medicine/T.B. & Chest/Tuberculosis & Respiratory Diseases)': 67,
        'MD (Skin & V.D / Dermatology Ven. & Leprosy)': 42, 'MD (Tropical Medicine)': 66, 'MS (Anatomy)': 34,
        'MS (E.N.T./ Otorhinolaryngology)': 68, 'MS (General Surgery)': 69, 'MS (Obstetrics & Gynaecology)': 70,
        'MS (Ophthalmology)': 71, 'MS (Orthopaedics)': 72, 'Post MBBS DNB (Emergency Medicine)': 82,
        'Post MBBS Diploma (Anaesthesia)': 146, 'Post MBBS Diploma (ENT)': 147, 'Post MBBS Diploma (Family Medicine)': 148,
        'Post MBBS Diploma (Obs & Gyne)': 149, 'Post MBBS Diploma (Ophthalmology)': 150,
        'Post MBBS Diploma (Paediatrics)': 151, 'Post MBBS Diploma (TB & Chest)': 153
    }
    
    PRIVATE_INSTS = {1345, 1346, 289, 290, 291, 292, 294, 295, 5749}
    HOSPITALS = {622, 626, 629, 630, 710, 730, 742, 754, 761, 764, 769, 770, 771, 772, 773, 777, 838, 922, 964, 1049, 1065, 1087, 1122, 1147, 1186, 1436, 1437, 1438}
    
    QUOTA_TEMPLATES = {
        106: {'id': 106, 'name': 'Rajasthan Govt Seats - Govt Quota', 'short_name': 'RAJ Govt - Govt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Govt Seats'},
        8106: {'id': 8106, 'name': 'Rajasthan Govt Seats - Govt Quota (In-Service)', 'short_name': 'RAJ Govt - Govt Quota (In-Service)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Govt Seats'},
        506: {'id': 506, 'name': 'Rajasthan Govt Seats - Management Quota', 'short_name': 'RAJ Govt - Mgmt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Govt Seats'},
        8506: {'id': 8506, 'name': 'Rajasthan Govt Seats - Management Quota (In-Service)', 'short_name': 'RAJ Govt - Mgmt Quota (In-Service)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Govt Seats'},
        108: {'id': 108, 'name': 'Rajasthan Private Seats - Govt Quota', 'short_name': 'RAJ Priv-Govt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Private Seats'},
        8108: {'id': 8108, 'name': 'Rajasthan Private Seats - Govt Quota (In-Service)', 'short_name': 'RAJ Priv-Govt Quota (In-Service)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Private Seats'},
        109: {'id': 109, 'name': 'Rajasthan Private Seats - Management Quota', 'short_name': 'RAJ Priv-Mgmt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Private Seats'},
        8109: {'id': 8109, 'name': 'Rajasthan Private Seats - Management Quota (In-Service)', 'short_name': 'RAJ Priv-Mgmt Quota (In-Service)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Private Seats'},
        107: {'id': 107, 'name': 'Rajasthan Private Seats - All India (Eligibility)', 'short_name': 'RAJ Priv-All India', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Private Seats'},
        8107: {'id': 8107, 'name': 'Rajasthan Private Seats - All India (Eligibility) (In-Service)', 'short_name': 'RAJ Priv-All India (In-Service)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan Private Seats'},
        178: {'id': 178, 'name': 'Rajasthan DNB Inservice Seats', 'short_name': 'Raj DNB Serv', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Rajasthan DNB Inservice Seats'}
    }
    
    CAT_MAP = {
        'General': 'GEN', 'General - PwBD': 'GEN-PwD', 'EWS': 'EWS', 'EWS - PwBD': 'EWS-PwD',
        'OBC NCL': 'OBC', 'OBC NCL - PwBD': 'OBC-PwD', 'MBC NCL': 'MBC', 'MBC NCL - PwBD': 'MBC-PwD',
        'SC': 'SC', 'SC - PwBD': 'SC-PwD', 'ST': 'ST', 'ST - STA': 'ST-STA'
    }
    
    with open(json_path) as fp:
        raw_data = json.load(fp)
        
    lookup = {}
    inst_samples = {}
    for item in raw_data:
        k = (item['institute']['id'], item['course']['id'], item['quota']['id'], item['category'])
        lookup[k] = item
        if item['institute']['id'] not in inst_samples:
            inst_samples[item['institute']['id']] = item
            
    with open(csv_path) as fp:
        rows = list(csv.DictReader(fp))
        
    print(f"Rajasthan existing options: {len(raw_data)}, CSV rows: {len(rows)}")
    
    grouped = defaultdict(list)
    for r in rows:
        inst_id = COLLEGES[clean(r['college'])]
        course_id = COURSES[r['specialization']]
        quota_str = r['quota']
        cat_str = r['category']
        
        is_inservice = '(In-Service)' in cat_str
        clean_cat = cat_str.replace('(In-Service)', '').strip()
        cat = CAT_MAP.get(clean_cat, clean_cat)
        
        if inst_id in HOSPITALS:
            q_id = 178
        elif inst_id in PRIVATE_INSTS:
            if quota_str == 'AI':
                q_id = 8107 if is_inservice else 107
            elif quota_str == 'Management':
                q_id = 8109 if is_inservice else 109
            else:
                q_id = 8108 if is_inservice else 108
        else: # govt
            if quota_str == 'Management':
                q_id = 8506 if is_inservice else 506
            else:
                q_id = 8106 if is_inservice else 106
                
        s_rank = int(r['state_closing_rank']) if r['state_closing_rank'] else None
        ai_rank = int(r['ai_closing_rank']) if r['ai_closing_rank'] else None
        grouped[(inst_id, course_id, q_id, cat, is_inservice)].append((s_rank, ai_rank))
        
    matched_count = 0
    new_count = 0
    
    for (inst_id, course_id, q_id, cat, is_inservice), ranks in grouped.items():
        state_ranks = [rk[0] for rk in ranks if rk[0] is not None]
        ai_ranks = [rk[1] for rk in ranks if rk[1] is not None]
        closing_rank = max(state_ranks) if state_ranks else None
        ai_closing_rank = max(ai_ranks) if ai_ranks else None
        allotments_count = len(state_ranks) if state_ranks else 1
        
        cr_2026_1 = {
            'value': f"{closing_rank}({allotments_count})" if closing_rank else None,
            'session': '2026',
            'round': '1',
            'closing_rank': closing_rank,
            'counselling_rank': closing_rank,
            'ai_rank': ai_closing_rank,
            'allotments_count': allotments_count,
            'inservice_candidate': is_inservice,
            'candidate_flag': 'inservice_candidate' if is_inservice else None
        }
        
        key = (inst_id, course_id, q_id, cat)
        if key in lookup:
            lookup[key]['cr_2026_1'] = cr_2026_1
            matched_count += 1
        else:
            sample = inst_samples.get(inst_id)
            inst_obj = sample['institute'] if sample else ALL_INSTS.get(inst_id, {'id': inst_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            course_obj = sample['course'] if (sample and sample['course']['id'] == course_id) else ALL_COURSES.get(course_id, {'id': course_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            quota_obj = QUOTA_TEMPLATES[q_id]
            
            new_opt = {
                'id': allocate_id(),
                'state': 'Rajasthan',
                'institute': {
                    'id': inst_obj['id'],
                    'name': inst_obj['name'],
                    'short_name': inst_obj.get('short_name', inst_obj['name'][:35]),
                    'logo_url': inst_obj.get('logo_url'),
                    'district': inst_obj.get('district')
                },
                'course': {
                    'id': course_obj['id'],
                    'name': course_obj['name'],
                    'short_name': course_obj.get('short_name', course_obj['name'][:25])
                },
                'quota': quota_obj,
                'category': cat,
                'counselling': {'id': 25, 'name': 'Rajasthan - PG Medical', 'short_name': 'RJSTHN PG'},
                'cr_2026_1': cr_2026_1,
                'fee_id': sample.get('fee_id') if sample else None,
                'fee': sample.get('fee') if sample else None,
                'stipend_year_1': sample.get('stipend_year_1') if sample else None,
                'bond_years': sample.get('bond_years') if sample else None,
                'bond_penalty': sample.get('bond_penalty') if sample else None,
                'beds': sample.get('beds') if sample else None,
                'choice_list_count': 0
            }
            raw_data.append(new_opt)
            lookup[key] = new_opt
            new_count += 1
            
    print(f"Rajasthan matched existing choices: {matched_count}, new choices added: {new_count}")
    print(f"Rajasthan total choices now: {len(raw_data)}")
    
    if not DRY_RUN:
        with open(json_path, 'w') as fp:
            json.dump(raw_data, fp, indent=2)
        print(f"Saved {json_path}")


# ==============================================================================
# STATE 5: UTTAR PRADESH
# ==============================================================================
def process_up():
    print("\n----------------------------------------")
    print("Processing State: Uttar Pradesh")
    print("----------------------------------------")
    
    csv_path = os.path.join(DATA_RAW, 'cutoffs_up_round_1_2026.csv')
    json_path = os.path.join(DATA_RAW, 'Uttar pradesh.json')
    
    UP_EXACT_MAP = {
        'AUTONOMOUS MEDICAL COLLEGE, AYODHYA': 512,
        'AUTONOMOUS STATE MEDICAL COLLEGE, AYODHYA': 512,
        'AUTONOMOUS MEDICAL COLLEGE, BAHRAICH': 5334,
        'AUTONOMOUS MEDICAL COLLEGE, BASTI': 5330,
        'AUTONOMOUS MEDICAL COLLEGE, DEORIA': 5336,
        'AUTONOMOUS MEDICAL COLLEGE, ETAH': 3501,
        'AUTONOMOUS STATE MEDICAL COLLEGE, ETAH': 3501,
        'AUTONOMOUS MEDICAL COLLEGE, FATEHPUR': 6141,
        'AUTONOMOUS MEDICAL COLLEGE, FIROZABAD': 5332,
        'AUTONOMOUS MEDICAL COLLEGE, GHAZIPUR': 6410,
        'MAHARSHI VISHWAMITRA AUTONOMOUS STATE MEDICAL COLLEGE, RTI MAIDAN, GHAZIPUR': 6410,
        'AUTONOMOUS MEDICAL COLLEGE, HARDOI': 3502,
        'AUTONOMOUS STATE MEDICAL COLLEGE, HARDOI': 3502,
        'AUTONOMOUS MEDICAL COLLEGE, JAUNPUR': 5337,
        'AUTONOMOUS MEDICAL COLLEGE, MIRZAPUR': 6143,
        'AUTONOMOUS MEDICAL COLLEGE, PRATAPGARH': 6375,
        'RAJA PRATAP BAHADUR HOSPITAL ALLIED WITH DR SONELAL PATEL AUTONOMOUS STATE MEDICAL COLLEGE, PRATAPGARH': 3558,
        'AUTONOMOUS MEDICAL COLLEGE, SHAHJAHANPUR': 5333,
        'AUTONOMOUS STATE MEDICAL COLLEGE & ALLIED PANDIT RAM PRASAD BISMIL MEMORIAL HOSPITAL, SHAHJAHANPUR': 1472,
        'AUTONOMOUS MEDICAL COLLEGE, SIDDHARTHNAGAR': 6140,
        'AUTONOMOUS STATE MEDICAL COLLEGE, TILOI, AMETHI': 6266,
        'BABA RAGHAV DAS MEDICAL COLLEGE, GORAKHPUR': 380,
        'CAREER INSTITUTE OF MEDICAL SCIENCES, LKO': 395,
        'CAREER INSTITUTE OF MEDICAL SCIENCES, LKO (MUSLIM MINORITY)': 395,
        'DR. RAM MANOHAR LOHIA INSTITUTE OF MEDICAL SCIENCES, LUCKNOW': 400,
        'ERA MEDICAL COLLEGE LUCKNOW': 374,
        'ERA MEDICAL COLLEGE LUCKNOW (MUSLIM MINORITY)': 374,
        'F.H. MEDICAL COLLEGE & HOSPITAL, AGRA': 389,
        'F.H. MEDICAL COLLEGE & HOSPITAL, AGRA (MUSLIM MINORITY)': 389,
        'G.S. MEDICAL COLLEGE, HAPUR': 1930,
        'GANESH SHANKAR VIDYARTHI MEMORIAL MEDICAL COLLEGE, KANPUR': 376,
        'GOVERNMENT INSTITUTE OF MEDICAL SCIENCES, GREATER NOIDA': 755,
        'GIMS, GREATER NOIDA, GAUTAM BUDDHA NAGAR': 755,
        'GOVERNMENT MEDICAL COLLEGE, AMBEDKAR NAGAR': 1476,
        'MRA MEDICAL COLLEGE, AMBEDKAR NAGAR': 1476,
        'GOVERNMENT MEDICAL COLLEGE, AZAMGARH': 1354,
        'GOVERNMENT MEDICAL COLLEGE & SUPER SPCIALITY HOSPITAL, CHAKRAPANPUR, AZAMGARH': 1354,
        'GOVERNMENT MEDICAL COLLEGE, BADAUN': 1475,
        'GOVERNMENT MEDICAL COLLEGE, GUNERA, WAZIDPUR, BADAUN': 1475,
        'GOVERNMENT MEDICAL COLLEGE, BANDA': 1353,
        'RANI DURGAVATI MEDICAL COLLEGE (GOVERNMENT ALLOPATHIC MEDICAL COLLEGE), BANDA': 1353,
        'GOVERNMENT MEDICAL COLLEGE, JALAUN': 1944,
        'GOVERNMENT MEDICAL COLLEGE, KANNAUJ': 2339,
        'GOVERNMENT MEDICAL COLLEGE, SAHARANPUR': 1355,
        'HERITAGE MEDICAL COLLEGE, VARANASI': 388,
        'HIND MEDICAL COLLEGE BARABANKI': 398,
        'HIND MEDICAL COLLEGE, SITAPUR': 391,
        'INSTITUTE OF MENTAL HEALTH & HOSPITAL, AGRA': 404,
        'INTEGRAL INSTITUTE OF MEDICAL SCIENCES, LUCKNOW': 390,
        'INTEGRAL INSTITUTE OF MEDICAL SCIENCES, LUCKNOW (MUSLIM MINORITY)': 390,
        'K.D. MEDICAL COLLEGE, MATHURA': 1356,
        'K.M. MEDICAL COLLEGE, MATHURA': 1357,
        'KING GEORGES MEDICAL UNIVESITY, LUCKNOW': 372,
        'LALA LAJPAT RAI MEMORIAL MEDICAL COLLEGE, MEERUT': 373,
        'MAHARANI LAXMI BAI MEDICAL COLLEGE, JHANSI': 377,
        'MAHARSHI DEVRAHA BABA AUTONOMOUS STATE MEDICAL COLLEGE, DEORIA': 5336,
        'MAHARSHI VASHISHTHA AUTONOMOUS STATE MEDICAL COLLEGE & OPEC HOSPITAL, BASTI': 5330,
        'MAYO INSTITUTE OF MEDICAL SCIENCE, BARABANKI': 392,
        'MOTI LAL NEHRU MEDICAL COLLEGE, PRAYAGRAJ': 375,
        'MUZAFFAR NAGAR MEDICAL COLLEGE MUZAFFAR NAGAR': 382,
        'NARAINA MEICAL COLLEGE & RESEARCH CENTRE, KANPUR': 6342,
        'NATIONAL CAPITAL MEDICAL COLLEGE, MEERUT': 1931,
        'NOIDA INTERNATIONAL INSTITUTE OF MEDICAL SCIENCES, GREATER NOIDA': 5742,
        'POST GRADUATE INSTITUTE OF CHILD HEALTH, NOIDA': 394,
        'PRASAD MEDICAL COLLEGE, LUCKNOW': 1929,
        'RAJSHREE MEDICAL RESEARCH INSTITUTE BAREILLY': 393,
        'RAMA MEDICAL COLLEGE HOSPITAL & RESEARCH CENTRE, HAPUR': 399,
        'RAMA MEDICAL COLLEGE KANPUR': 396,
        'REGIONAL INSTITUTE OF OPHTHALMOLOGY, SITAPUR': 387,
        'ROHILKHAND MEDICAL COLLEGE, BAREILLY': 383,
        'SANJAY GANDHI POSTGRADUATE INSTITUTE OF MEDICAL SCIENCE, LUCKNOW': 379,
        'SARASWATI INSTITUTE OF MEDICAL SCIENCES HAPUR': 384,
        'SARASWATI MEDICAL COLLEGE, UNNAO': 6369,
        'SAROJINI NAIDU MEDICAL COLLGE, AGRA': 369,
        'SCHOOL OF MEDICAL SCIENCES & RESEARCH, SHARDA UNIVERSITY G. NOIDA': 385,
        'SHRI RAM MURTI MEDICAL SCIENCES BARILLY': 402,
        'SKS HOSPITAL MEDICAL COLLEGE & RESEARCH CENTER, MATHURA': 6370,
        'SUBHARATI MEDICAL COLLEGE, MEERUT': 381,
        'T.S. MISHRA MEDICAL COLLEGE & HOSPITAL, LUCKNOW': 397,
        'TEERTHANKER MAHAVEER UNIVERSITY, MORADABAD': 378,
        'TEERTHANKER MAHAVEER UNIVERSITY, MORADABAD (JAIN MINORITY)': 378,
        'UNITED MEDICAL COLLEGE, PRAYAGRAJ': 3435,
        'UTTAR PRADESH UNIVERSITY OF MEDICAL SCIENCES, SAIFAI, ETAWAH': 5308,
        'VARUNARJUN MEDICAL COLLEGE, SHAHAJANPUR': 1358,
        'VENKATESHWARA MEDICAL COLLEGE, AMROHA': 1359,
        'KALYAN SINGH GOVERNMENT MEDICAL COLLEGE, CHANDPUR ROAD, NEAR TEHSIL SADAR,BULANDSHAHR': 6273,
        # Hospitals
        'BALRAMPUR HOSPITAL, GOLAGANJ, LUCKNOW': 519,
        'DISTRICT COMBINED HOSPITAL, VRINDAVAN, MATHURA': 5178,
        'DISTRICT HOSPITAL, MALE BUDAUN, KUTCHERY ROAD BUDAUN': 6268,
        'DISTRICT MALE HOSPITAL, KOTWALI ROAD, BASTI': 5186,
        'DISTRICT WOMEN HOSPITAL JAUNPUR, SAHABUDDINPUR, BHANDARI STATION ROAD, JAUNPUR': 6269,
        'DISTRICT WOMEN HOSPITAL, BAJORIA ROAD, SAHARANPUR': 5193,
        'DISTRICT WOMEN HOSPITAL, NAKA SATRIKH, BARABANKI': 5188,
        'DIVISIONAL DISTRICT HOSPITAL, DDU MARG, BALRAMPUR, HARRA KI CHUNGI, SADAR, AZAMGARH': 5194,
        'DR. SHYAMA PRASAD MUKHARJEE (CIVIL) HOSPITAL, HAZRATGANJ, LUCKNOW': 638,
        'LOK BANDHU RAJ NARAYAN COMBINED HOSPITAL, LDA COLONY, KANPUR ROAD, LUCKNOW': 5225,
        'MANAYAWAR KANSHI RAM DISTRCIT COMBINED HOSPITAL AND TRAUMA CENTRE, RAMADEVI KANPUR NAGAR': 6277,
        'NETAJI SUBHASH CHANDRA BOSE DISTRICT HOSPITAL, GORAKHPUR': 5241,
        'P.L. SHARMA DISTRICT HOSPITAL, AHMAD ROAD, NEAR GHANTAGHAR, MEERUT': 1015,
        'PANDIT DEEN DAYAL UPADHYAY GOVERNMENT HOSPITAL, PANDEYPUR, VARANASI': 5252,
        'RAM SAGAR MISHRA COMBINED HOSPITAL, SADHAMAU BKT LUCKNOW': 6671,
        'RANA BENI MADHAV SINGH DISTRICT HOSPITAL, NIRALANAGAR, KACHAHARI ROAD, RAIBARELI': 5266,
        'RANI LAXMI BAI COMBINED HOSPITAL LUYCKNOW, A BLOCK RAJAJIPURAM LUCKNOW': 6673,
        'SRI RAM HOSPITAL NEAR AYODHYA JUNCTION, AYODHYA': 5299,
        'SWAMI KALYAN DEV DISTRICT HOSPITAL, LADDHAWALA, MUZAFFARNAGAR': 5305,
        'TEJ BAHADUR SAPRU HOSPITAL, STANLEY ROAD, ALLAHABAD': 1217,
        'URSALA HORSMAN MEMORIAL HOSPITAL, BADA CHUARAHA, CIVIL LINES, KANPUR': 1240
    }
    
    UP_COURSE_MAP = {
        'MD ANAESTHESIA': 32, 'MS ANATOMY': 34, 'MD BIOCHEMISTRY': 37, 'MD COMMUNITY MEDICINE': 63,
        'MD DERMATOLOGY': 42, 'MD EMERGENCY MEDICINE': 43, 'MS ENT': 68, 'MD FORENSIC MEDICINE': 45,
        'MD GENERAL MEDICINE': 46, 'MS GENERAL SURGERY': 69, 'MD HOSPITAL ADMINISTRATION': 48,
        'MD IMMUNOHAEMATOLOGY & BLOOD TRANSFUISION': 49, 'MD MICROBIOLOGY': 51, 'MD NUCLEAR MEDICINE': 52,
        'MS OBSTETRICS & GYNAECOLOGY': 70, 'MS OPHTHALMOLOGY': 71, 'MS ORTHOPAEDICS': 72,
        'MD PAEDIATRICS': 53, 'MD PATHOLOGY': 55, 'MD PHARMACOLOGY': 57,
        'MD PHYSICAL MEDICINE AND REHABILITATION': 58, 'MD PHYSIOLOGY': 59, 'MD PSYCHIATRY': 60,
        'MD RADIATION ONCOLOGY': 61, 'MD RADIODIAGNOSIS': 62, 'MD RESPIRATORY MEDICINE': 67,
        'MD SPORTS MEDICINE': 64, 'MD TRAUMATOLOGY & SURGERY': 73,
        'DA': 1, 'DCH': 3, 'DGO': 18, 'DLO': 21, 'DMRD': 27, 'DVD': 6, 'D ORTH': 20,
        'ANESTHESIOLOGY (POST MBBS DNB)': 77, 'EMERGENCY MEDICINE (POST MBBS DNB)': 82,
        'FAMILY MEDICINE (POST MBBS DNB)': 83, 'GENERAL MEDICINE (POST MBBS DNB)': 85,
        'GENERAL SURGERY (POST MBBS DNB)': 86, 'OBS & GYNAE (POST MBBS DNB)': 92,
        'ORTHOPEDICS (POST MBBS DNB)': 94, 'PEDIATRICS (POST MBBS DNB)': 97,
        'PSYCHIATRY (POST MBBS DNB)': 103, 'SKIN (POST MBBS DNB)': 81,
        'ANESTHESIOLOGY (POST MBBS DIPLOMA)': 146, 'OBS & GYNAE (POST MBBS DIPLOMA)': 149,
        'OPHTHALMOLOGY (POST MBBS DIPLOMA)': 150, 'PEDIATRICS (POST MBBS DIPLOMA)': 151,
        'RADIODIAGNOSIS (POST MBBS DIPLOMA)': 152, 'RESPIRATORY MEDICINE (TB & CHEST) (POST MBBS DIPLOMA)': 153
    }
    
    HOSPITALS = {519, 5178, 6268, 5186, 6269, 5193, 5188, 5194, 638, 5225, 6277, 5241, 1015, 5252, 6671, 5266, 6673, 5299, 5305, 1217, 1240, 3558, 1472}
    MINORITY_COLLEGES = {374, 395, 390, 389, 378}
    
    QUOTA_TEMPLATES = {
        115: {'id': 115, 'name': 'Uttar Pradesh Govt Quota', 'short_name': 'UP-Govt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Uttar Pradesh Govt Quota'},
        8115: {'id': 8115, 'name': 'Uttar Pradesh Govt Quota (In-Service)', 'short_name': 'UP-Govt Quota (In-Service)', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Uttar Pradesh Govt Quota'},
        176: {'id': 176, 'name': 'Uttar Pradesh DNB Inservice Seats', 'short_name': 'UP DNB Serv', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Uttar Pradesh DNB Inservice Seats'},
        116: {'id': 116, 'name': 'Uttar Pradesh Private Seats - Open Quota', 'short_name': 'UP Priv-Open Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Uttar Pradesh Private Seats'},
        117: {'id': 117, 'name': 'Uttar Pradesh Private Seats - Minority Quota', 'short_name': 'UP Priv-Min. Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Uttar Pradesh Private Seats'}
    }
    
    CAT_MAP = {
        'UR Open': 'UR', 'EWS Open': 'EW', 'BC Open': 'BC', 'SC Open': 'SC', 'ST Open': 'ST',
        'UR PwD': 'UR-PH', 'BC PwD': 'BC-PH', 'BS Open': 'BS', 'SS Open': 'SS'
    }
    
    with open(json_path) as fp:
        raw_data = json.load(fp)
        
    lookup = {}
    inst_samples = {}
    for item in raw_data:
        k = (item['institute']['id'], item['course']['id'], item['quota']['id'], item['category'])
        lookup[k] = item
        if item['institute']['id'] not in inst_samples:
            inst_samples[item['institute']['id']] = item
            
    with open(csv_path) as fp:
        rows = list(csv.DictReader(fp))
        
    print(f"UP existing options: {len(raw_data)}, CSV rows: {len(rows)}")
    
    grouped = defaultdict(list)
    for r in rows:
        inst_id = UP_EXACT_MAP[r['college'].strip()]
        course_id = UP_COURSE_MAP[r['specialization'].strip()]
        q_raw = r['quota'].strip()
        cat_raw = r['category'].strip()
        
        cat = CAT_MAP.get(cat_raw, cat_raw)
        is_inservice = cat in ('BS', 'SS')
        
        if inst_id in HOSPITALS:
            q_id = 176
        elif q_raw == 'Govt.':
            q_id = 8115 if is_inservice else 115
        else: # Private
            q_id = 117 if inst_id in MINORITY_COLLEGES else 116
            
        s_rank = int(r['state_closing_rank']) if r['state_closing_rank'] else None
        ai_rank = int(r['ai_closing_rank']) if r['ai_closing_rank'] else None
        grouped[(inst_id, course_id, q_id, cat, is_inservice)].append((s_rank, ai_rank))
        
    matched_count = 0
    new_count = 0
    
    for (inst_id, course_id, q_id, cat, is_inservice), ranks in grouped.items():
        state_ranks = [rk[0] for rk in ranks if rk[0] is not None]
        ai_ranks = [rk[1] for rk in ranks if rk[1] is not None]
        closing_rank = max(state_ranks) if state_ranks else None
        ai_closing_rank = max(ai_ranks) if ai_ranks else None
        allotments_count = len(state_ranks) if state_ranks else 1
        
        cr_2026_1 = {
            'value': f"{closing_rank}({allotments_count})" if closing_rank else None,
            'session': '2026',
            'round': '1',
            'closing_rank': closing_rank,
            'counselling_rank': closing_rank,
            'ai_rank': ai_closing_rank,
            'allotments_count': allotments_count,
            'inservice_candidate': is_inservice,
            'candidate_flag': 'inservice_candidate' if is_inservice else None
        }
        
        key = (inst_id, course_id, q_id, cat)
        if key in lookup:
            lookup[key]['cr_2026_1'] = cr_2026_1
            matched_count += 1
        else:
            sample = inst_samples.get(inst_id)
            inst_obj = sample['institute'] if sample else ALL_INSTS.get(inst_id, {'id': inst_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            course_obj = sample['course'] if (sample and sample['course']['id'] == course_id) else ALL_COURSES.get(course_id, {'id': course_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            quota_obj = QUOTA_TEMPLATES[q_id]
            
            new_opt = {
                'id': allocate_id(),
                'state': 'Uttar Pradesh',
                'institute': {
                    'id': inst_obj['id'],
                    'name': inst_obj['name'],
                    'short_name': inst_obj.get('short_name', inst_obj['name'][:35]),
                    'logo_url': inst_obj.get('logo_url'),
                    'district': inst_obj.get('district')
                },
                'course': {
                    'id': course_obj['id'],
                    'name': course_obj['name'],
                    'short_name': course_obj.get('short_name', course_obj['name'][:25])
                },
                'quota': quota_obj,
                'category': cat,
                'counselling': {'id': 32, 'name': 'Uttar Pradesh - PG Medical', 'short_name': 'UP PG'},
                'cr_2026_1': cr_2026_1,
                'fee_id': sample.get('fee_id') if sample else None,
                'fee': sample.get('fee') if sample else None,
                'stipend_year_1': sample.get('stipend_year_1') if sample else None,
                'bond_years': sample.get('bond_years') if sample else None,
                'bond_penalty': sample.get('bond_penalty') if sample else None,
                'beds': sample.get('beds') if sample else None,
                'choice_list_count': 0
            }
            raw_data.append(new_opt)
            lookup[key] = new_opt
            new_count += 1
            
    print(f"UP matched existing choices: {matched_count}, new choices added: {new_count}")
    print(f"UP total choices now: {len(raw_data)}")
    
    if not DRY_RUN:
        with open(json_path, 'w') as fp:
            json.dump(raw_data, fp, indent=2)
        print(f"Saved {json_path}")


# ==============================================================================
# STATE 6: UTTARAKHAND
# ==============================================================================
def process_uttarakhand():
    print("\n----------------------------------------")
    print("Processing State: Uttarakhand")
    print("----------------------------------------")
    
    csv_path = os.path.join(DATA_RAW, 'cutoffs_uk_round_1_2026.csv')
    json_path = os.path.join(DATA_RAW, 'Uttarakhand.json')
    
    COLLEGES = {
        'GOVERNMENT DOON MEDICAL COLLEGE, DEHRADUN': 365,
        'GOVERNMENT MEDICAL COLLEGE, HALDWANI': 366,
        'SOBHAN SINGH JEENA GOVT, INSTITUTE OF MEDICAL SCIENNCE & RESEARCH ALMORA': 6066,
        'VEER CHANDRA SINGH GARHWALI GOVT. INSTITUTE OF MEDICAL SCIENCE & RESEARCH, SRINAGAR (GARHWAL)': 368,
        'HIMALAYAN INSTITUTE OF MEDICAL SCIENCE, DEHRADUN': 364,
        'SHRI GURU RAM RAI INSTITUE OF MEDICAL & HEALTH SCIENCES, DEHRADUN': 367,
        'Gautam Buddha Chikitsa Mahavidyalaya': 6371
    }
    
    COURSES = {
        'Anaesthesiology': 32, 'Anatomy': 34, 'Biochemistry': 37, 'Community Medicine': 63,
        'Dermatology': 42, 'Dermatology,Venereology & Leprosy': 42,
        'Diploma in ENT (Post MBBS DIPLOMA Seats)': 147, 'ENT': 68, 'Emergency Medicine': 43,
        'Forensic Medicine': 45, 'General Medicine': 46, 'General Surgery': 69,
        'General Surgery (Post MBBS DNB Seats)': 86, 'Immuno Hematology & Blood Transfusion': 49,
        'Microbiology': 51, 'Obst. & Gyane': 70, 'Ophthalmology': 71, 'Orthopaedics': 72,
        'Orthopaedics (Post MBBS DNB Seats)': 94, 'Paediatrics': 53, 'Pathology': 55,
        'Pharmacology': 57, 'Psychiatry': 60, 'Radiation Oncology': 61, 'Radiodiagnosis': 62,
        'Respiratory Medicine': 67, 'TB & Respiratory Medicine/Pulmonary Medicine': 67,
        'Tb & chest DA (NAEMS) (Post MBBS DIPLOMA Seats)': 153
    }
    
    QUOTA_TEMPLATES = {
        118: {'id': 118, 'name': 'Uttarakhand Govt Quota', 'short_name': 'UK-Govt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Uttarakhand Govt Quota'},
        119: {'id': 119, 'name': 'Uttarakhand Private Seats - All India / Management', 'short_name': 'UK Priv-AI/Mgmt', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Uttarakhand Private Seats'},
        120: {'id': 120, 'name': 'Uttarakhand Private Seats - Govt Quota', 'short_name': 'UK Priv-Govt Quota', 'tooltip_content': None, 'tooltip_content_html': None, 'master_quota': 'Uttarakhand Private Seats'}
    }
    
    CAT_MAP = {
        'EWS(OPEN)': 'EWS-OPEN', 'EWS(WOMEN)': 'EWS-WOMEN',
        'OBC(NCL)(OPEN)': 'OBC-OPEN', 'OBC(NCL)(WOMEN)': 'OBC-WOMEN',
        'SC(OPEN)': 'SC-OPEN', 'SC(WOMEN)': 'SC-WOMEN', 'ST(OPEN)': 'ST-OPEN',
        'UR(DPW)': 'UR-DPW', 'UR(FF)': 'UR-FF', 'UR(OPEN)': 'UR-OPEN',
        'UR(Open)': 'UR-OPEN', 'UR(WOMEN)': 'UR-WOMEN'
    }
    
    with open(json_path) as fp:
        raw_data = json.load(fp)
        
    lookup = {}
    inst_samples = {}
    for item in raw_data:
        k = (item['institute']['id'], item['course']['id'], item['quota']['id'], item['category'])
        lookup[k] = item
        if item['institute']['id'] not in inst_samples:
            inst_samples[item['institute']['id']] = item
            
    with open(csv_path) as fp:
        rows = list(csv.DictReader(fp))
        
    print(f"Uttarakhand existing options: {len(raw_data)}, CSV rows: {len(rows)}")
    
    grouped = defaultdict(list)
    for r in rows:
        inst_id = COLLEGES[r['college']]
        course_id = COURSES[r['specialization']]
        q_raw = r['quota']
        cat_raw = r['category']
        
        is_govt = inst_id in (365, 366, 6066, 368)
        if is_govt:
            q_id = 118
        else:
            q_id = 119 if q_raw == 'All India quota' else 120
            
        cat = CAT_MAP.get(cat_raw, cat_raw)
        
        s_rank = int(r['state_closing_rank']) if r['state_closing_rank'] else None
        ai_rank = int(r['ai_closing_rank']) if r['ai_closing_rank'] else None
        grouped[(inst_id, course_id, q_id, cat)].append((s_rank, ai_rank))
        
    matched_count = 0
    new_count = 0
    
    for (inst_id, course_id, q_id, cat), ranks in grouped.items():
        state_ranks = [rk[0] for rk in ranks if rk[0] is not None]
        ai_ranks = [rk[1] for rk in ranks if rk[1] is not None]
        closing_rank = max(state_ranks) if state_ranks else None
        ai_closing_rank = max(ai_ranks) if ai_ranks else None
        allotments_count = len(state_ranks) if state_ranks else 1
        
        cr_2026_1 = {
            'value': f"{closing_rank}({allotments_count})" if closing_rank else None,
            'session': '2026',
            'round': '1',
            'closing_rank': closing_rank,
            'counselling_rank': closing_rank,
            'ai_rank': ai_closing_rank,
            'allotments_count': allotments_count,
            'inservice_candidate': False,
            'candidate_flag': None
        }
        
        key = (inst_id, course_id, q_id, cat)
        if key in lookup:
            lookup[key]['cr_2026_1'] = cr_2026_1
            matched_count += 1
        else:
            sample = inst_samples.get(inst_id)
            inst_obj = sample['institute'] if sample else ALL_INSTS.get(inst_id, {'id': inst_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            course_obj = sample['course'] if (sample and sample['course']['id'] == course_id) else ALL_COURSES.get(course_id, {'id': course_id, 'name': 'Unknown', 'short_name': 'Unknown'})
            quota_obj = QUOTA_TEMPLATES[q_id]
            
            new_opt = {
                'id': allocate_id(),
                'state': 'Uttarakhand',
                'institute': {
                    'id': inst_obj['id'],
                    'name': inst_obj['name'],
                    'short_name': inst_obj.get('short_name', inst_obj['name'][:35]),
                    'logo_url': inst_obj.get('logo_url'),
                    'district': inst_obj.get('district')
                },
                'course': {
                    'id': course_obj['id'],
                    'name': course_obj['name'],
                    'short_name': course_obj.get('short_name', course_obj['name'][:25])
                },
                'quota': quota_obj,
                'category': cat,
                'counselling': {'id': 33, 'name': 'Uttarakhand - PG Medical', 'short_name': 'UK PG'},
                'cr_2026_1': cr_2026_1,
                'fee_id': sample.get('fee_id') if sample else None,
                'fee': sample.get('fee') if sample else None,
                'stipend_year_1': sample.get('stipend_year_1') if sample else None,
                'bond_years': sample.get('bond_years') if sample else None,
                'bond_penalty': sample.get('bond_penalty') if sample else None,
                'beds': sample.get('beds') if sample else None,
                'choice_list_count': 0
            }
            raw_data.append(new_opt)
            lookup[key] = new_opt
            new_count += 1
            
    print(f"Uttarakhand matched existing choices: {matched_count}, new choices added: {new_count}")
    print(f"Uttarakhand total choices now: {len(raw_data)}")
    
    if not DRY_RUN:
        with open(json_path, 'w') as fp:
            json.dump(raw_data, fp, indent=2)
        print(f"Saved {json_path}")


if __name__ == '__main__':
    process_karnataka()
    process_mp()
    process_maharashtra()
    process_rajasthan()
    process_up()
    process_uttarakhand()
    print("\n=== ALL 6 STATES PROCESSED SUCCESSFULLY ===")
