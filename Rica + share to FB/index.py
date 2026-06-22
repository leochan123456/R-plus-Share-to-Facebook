import os
from flask import Flask, render_template, request, jsonify
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, template_folder='../templates')

PAGE_TOKEN = os.getenv("FACEBOOK_PAGE_TOKEN")
PAGE_ID = os.getenv("FACEBOOK_PAGE_ID")
BASE_URL = "https://graph.facebook.com/v15.0"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/publish', methods=['POST'])
def publish_pipeline():
    message = request.form.get('message')
    uploaded_photo = request.files.get('photo')
    uploaded_video = request.files.get('video')
    
    responses = {}

    try:
        # Scenario 1: User uploaded a Photo
        if uploaded_photo and uploaded_photo.filename != '':
            temp_path = os.path.join('/tmp', uploaded_photo.filename)
            uploaded_photo.save(temp_path)
            
            url = f"{BASE_URL}/{PAGE_ID}/photos"
            payload = {"caption": message, "access_token": PAGE_TOKEN}
            with open(temp_path, "rb") as img_file:
                files = {"source": img_file}
                fb_res = requests.post(url, data=payload, files=files)
            
            os.remove(temp_path)  # Clean up memory instantly
            responses['photo_post'] = fb_res.json()

        # Scenario 2: User uploaded a Video
        elif uploaded_video and uploaded_video.filename != '':
            temp_path = os.path.join('/tmp', uploaded_video.filename)
            uploaded_video.save(temp_path)
            
            url = f"{BASE_URL}/{PAGE_ID}/videos"
            payload = {"description": message, "access_token": PAGE_TOKEN}
            with open(temp_path, "rb") as video_file:
                files = {"source": video_file}
                fb_res = requests.post(url, data=payload, files=files)
                
            os.remove(temp_path)  # Clean up memory instantly
            responses['video_post'] = fb_res.json()

        # Scenario 3: Standard Text Post Only
        elif message:
            url = f"{BASE_URL}/{PAGE_ID}/feed"
            payload = {"message": message, "access_token": PAGE_TOKEN}
            fb_res = requests.post(url, json=payload)
            responses['text_post'] = fb_res.json()

        return jsonify({"status": "Execution Complete", "meta_responses": responses})

    except Exception as e:
        return jsonify({"status": "Failed", "error": str(e)}), 500
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True) # 🔴 改成 5050