##program to make a simple calculator using functions
print("welcome to calculator\n")

def add(x,y):
    return x+y
def sub(x,y):
    return x-y
def mul(x,y):
    return x*y
def div(x,y):
    if y == 0:
        return "Division by zero is not allowed."
    else:
        return x/y
def flr_div(x,y):
    if y == 0:
        return "Division by zero is not allowed."
    else:
        return x/y
def exp(x,y):
    return x**y
def mod(x,y):
    return x%y


def calculator():
    print("choose ur operation : ")
    print("1. addtion : ")
    print("2. subtraction : ")
    print("3. multiplication : ")
    print("4. division : ")
    print("5. floor division : ")
    print("6. exponential : ")
    print("7. modulus : ")

calculator()
choice = input("Enter choice (1/2/3/4//5/6/7): ")
x=int(input("value of 1st num : "))
y=int(input("value of 2st num : "))


if choice == '1':
    print("Result:", add(x,y))
elif choice == '2':
    print("Result:", sub(x,y))
elif choice == '3':
    print("Result:", mul(x,y))
elif choice == '4':
    print("Result:", div(x,y))
elif choice == '5':
    print("Result:", flr_div(x,y))
elif choice == '6':
    print("Result:", exp(x,y))
elif choice == '7':
    print("Result:", mod(x,y))
else:
    print("Invalid input")