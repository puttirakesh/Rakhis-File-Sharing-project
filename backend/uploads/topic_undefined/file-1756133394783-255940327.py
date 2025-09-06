##print
##print("hey",23,34, sep= "~",end="oops!\n")
##print("hello everyone")
##
####variables
##a=1;
##print(a)
##b="harry";
##print(b)
##c=45;
##print(a+b)
##print(a+c)
##
####data types
##a=1#integer
##b=True#boolean
##c="rakhi"#string
##d=None#none type
##print("the data type of a ::",type(a))
##print("the data type of b ::",type(b))
##print("the data type of c ::",type(c))
##print("the data type of d ::",type(d))
##
##list1=[3,4,5,-4,5,"apple","mango"]
##print(list1)
##tuple1 = ("animals","fruits","vegetables","human beings")
##print(tuple1)
##
####calculator using python
##print(5+4)
##print(5-4)
##print(5*4)
##print(5**4)
##print(5/4)
##print(5//4)
##print(5%4)
##
####Exersice1 - Calculator using python------------------------
##print("welcome to calculator\n")
##a=int(input("value of 1st num : "))
##b=int(input("value of 2st num : "))
##add=a+b
##print("\nsum of the nums : ",add)
##sub=a-b
##print("\ndifference of the nums : ",sub)
##div=a/b
##print("\ndivision of the nums : ",div)
##flr=a//b
##print("\nfloor division of the nums : ",flr)
##mul=a*b
##print("\nproduct of the nums : ",mul)
##exp=a**b
##print("\nexponent of the nums : ",exp)
##mod=a%b
##print("\nmodulus of the nums : ",mod)
##
##
####taking user input
##x=input("enter 1st number :: ")
##y=input("enter 2nd number :: ")
##print(x+y)
##print(int(x) + int(y))
##
####strings
##name="rakhi"
##print("hello"+name)
##print(name[0])
##print(name[1])
##print(name[2])
##print(name[3])
##print(name[4])
##
####string slicing & operations on array
##name="rakeshchowdary"
##leng=len(name)
##print("rakhi is a ",leng,"letter word")
####string as an array
##print(name[:6])
##print(name[0:6])
##print(name[3:9])
##print(name[0:-5])#-ve slicing
##print(name[0:len(name)-5])#-ve slicing
##print(name[-5:-1])

##string methods
str1="rakhiIIII !!!!!!!!!!!!!!"
print(str1.upper())#upper
str2="RAKHIiiiii"
print(str2.lower())#lower
print(str2.rstrip("i"))#strip
print(str2.replace("RAKHIiiiii","rakesh"))#replace
print(str1.split(" "))#split = it splits the data into parts
str3="HELLO wolrd how are u"
print(str3.capitalize())#capitalize the data
print(str3.center(50))#center = to show someting in center
str4="hi rakhi....how r u rakhi.....what r u doing rakhi.."
print(str4.count("rakhi"))#count = to count how many times does a word repeats in input
str5="welcome to my world.. how r u, what is it..!!!!!"
print(str5.endswith("!!!!!"))#endswith = to check if string ends with given value or not
print(str5.find("is"))
print(str5.find("kkk"))


##write a program to perform "Find and Replace" text activity on given string
def FAR(string, find, replace):
    return string.replace(find, replace)

# Test the function
string = "Hello, world! I hope you enjoy this beautiful day."
find = "world"
replace = "universe"

print(string)
result = FAR(string, find, replace)
print(result)




##Conditional statements----------------------

a= int(input("enter ur age : "))
print("ur age is : ",a)

print(a==18)
print(a<18)
print(a>18)
print(a<=18)
print(a>=18)
print(a!=18)

if(a>=18):
    print("u r a grownup, u can drive the bike")
elif(a<18):
    print("u can't drive the bike")
else:
    print("pls enter ur age !!")

##Exersice2 - switch statement
x= int(input("enter the num : "))
match x:
    case 0:
        print("u have entered zero")
    case 1:
        print("u have entered one")
    case 2:
        print("u have entered two")
    case 3:
        print("u have entered three")
    case 4:
        print("u have entered four")
    case _:
        print("default")


##Control statements------------------












