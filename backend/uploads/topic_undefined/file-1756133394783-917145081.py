##Print Current Date and Time
import datetime
time = datetime.datetime.now()
print('\n The current Date and Time are : ')

print('Date : ',end = "")
print(time.day)
print('month :',end = "")
print(time.month)
print('year :',end = "")
print(time.year)
print('hour : ',end = "")
print(time.hour)
print('minute : ',end = "")
print(time.minute)
print('second : ',end = "")
print(time.second)
print('microsecond : ',end = "")
print(time.microsecond)

##Time 12 hours to 24 hours
##1st method
from datetime import datetime

now = datetime.now()
hour=now.strftime('%Y/%m/%d %H:%M:%S')
hr=now.strftime('%Y/%m/%d %I:%M:%S')

print("The 24hr format is: ", hour)
print("The 12hr format is: ", hr)

##2nd method 
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


##Find Dates of yesterday today tomorrow
from datetime import datetime, timedelta

present = datetime.now() 
  
yesterday = present - timedelta(1)
  
tomorrow = present + timedelta(1)

print("Yesterday was = ", yesterday.strftime('%d-%m-%Y'))
print("Today is= ", present.strftime('%d-%m-%Y'))
print("Tomorrow is = ", tomorrow.strftime('%d-%m-%Y'))
##date1 = now.strftime('%d/%m/%Y')
##print("date = ", date1)
##
##date2 = now.strftime('%d/%m/%y')
##print("date = ", date2)
##
##date3 = now.strftime('%b %d,%Y')
##print("date = ", date3)
##
##date4 = now.strftime('%b-%d-%Y')
##print("date = ", date4)


##Difference of Current Time and Given Time
def time_difference(h1, m1, h2, m2):
    print("The current times: ", h1, ":", m1)
    t1 = h1 * 60 + m1
    print("The given times:", h2, ":", m2)
    t2 = h2 * 60 + m2
    if(t1 == t2):
        print("The difference: Both are Same !")
        return
    else:
        difference = t2 - t1
    h = (int(difference/60)) % 24
    m = difference % 60
    print("The difference: ", h, ":", m, "\n")
time_difference(4, 5, 6, 7)
time_difference(1, 1, 1, 1)

##Create Lap Timer

import time
start=time.time()
last=start
num=1

print("Press ENTER to count lap timer.\nPress CTRL+C to stop")
try:
	while True:
		input()
		lap=round((time.time() - last), 2)
		total=round((time.time() - start), 2)
		print("Lap Numer "+str(num))
		print("Total Time taken: "+str(total))
		print("Lap Time: "+str(lap))			
		print("*"*20)
		last=time.time()
		num+=1

# Stop
except KeyboardInterrupt:
	print("Process Stopped")
