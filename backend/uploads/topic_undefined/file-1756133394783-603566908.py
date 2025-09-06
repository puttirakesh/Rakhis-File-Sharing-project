##Print Current Date and Time

import datetime
time = datetime.datetime.now()
print ("The current date and time are: ")

print ("Date : ", end = "")
print (time.day)

print ("Month : ", end = "")
print (time.month)

print ("Year : ", end = "")
print (time.year)
	
print ("Hour : ", end = "")
print (time.hour)
	
print ("Minute : ", end = "")
print (time.minute)
	
print ("Second : ", end = "")
print (time.second)
	
print ("Microsecond : ", end = "")
print (time.microsecond)
