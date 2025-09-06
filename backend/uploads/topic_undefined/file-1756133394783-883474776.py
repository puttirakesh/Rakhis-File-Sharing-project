##Time 12 hours to 24 hours

'''from datetime import datetime

now = datetime.now()
hour=now.strftime('%Y/%m/%d %H:%M:%S')
hr=now.strftime('%Y/%m/%d %I:%M:%S')

print("The 24hr format is: ", hour)
print("The 12hr format is: ", hr)'''

def convert(string):

      if string[-2:] == "AM" and string[:2] == "12":
         return "00" + string[2:-2]

      elif string[-2:] == "AM":
         return string[:-2]

      elif string[-2:] == "PM" and string[:2] == "12":
         return string[:-2]
        
      else:
          return str(int(string[:2]) + 12) + string[2:8]

#driver code
time="01:58:42"+"PM"
print("12-hour Format time:: ", time)
print("24-hour Format time ::",convert(time))
