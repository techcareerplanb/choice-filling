import json

transcript_path = "/Users/rahulchaudhary/.gemini/antigravity-ide/brain/a663086e-6006-4950-b171-ad062cd0e10a/.system_generated/logs/transcript_full.jsonl"

pdf_content = ""

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("type") == "USER_INPUT":
                text = entry.get("content", "")
                if "==Start of PDF==" in text:
                    start_idx = text.find("==Start of PDF==")
                    end_idx = text.find("==End of PDF==") + len("==End of PDF==")
                    pdf_content = text[start_idx:end_idx]
                    break
        except Exception as e:
            continue

if pdf_content:
    with open("data/incoming/mcc-seat-matrix-pg-2025.txt", "w", encoding='utf-8') as f:
        f.write(pdf_content)
    print("Found and saved!")
else:
    print("Not found")
