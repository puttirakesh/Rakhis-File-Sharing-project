##Find Dates of yesterday today tomorrow
from datetime import datetime, timedelta

present = datetime.now() 
  
yesterday = present - timedelta(1)
  
tomorrow = present + timedelta(1)

print("Yesterday was = ", yesterday.strftime('%d-%m-%Y'))
print("Today is= ", present.strftime('%d-%m-%Y'))
print("Tomorrow will = ", tomorrow.strftime('%d-%m-%Y'))
