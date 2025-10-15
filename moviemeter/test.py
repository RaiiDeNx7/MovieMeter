from django.conf import settings
import requests
import json
from dotenv import load_dotenv
import os

#print(settings.API_KEY)
load_dotenv()

response = requests.get("https://api.themoviedb.org/3/movie/11", headers= {
    "Authorization": f"Bearer {os.getenv("MOVIEMETER_API_KEY")}"
})

print(response.text)
print(json.dumps(response.json(), indent=4))