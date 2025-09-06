''' 1. add new contact
    2. search contact
    3.display contact
    4.edit contact
    5.delete contact
    6.exit'''

contact ={}

def display_contact():
    print("Name \t\t Contact Number")

    for key in contact:
        print("{}\t\t{}".format(key.conatct.get(key)))

while True:
    
    choice = int(input("1. add new contact \n 2. search contact \n 3.display contact \n 4.edit contact \n 5.delete contact \n 6.exit"))
    print("Enter your choice : (1 to 6) : ")
    if choice == 1:
        name = input("Enter then contact name : ")
        phone = int(input("\n Enter the mobile number : "))
        contact[name] = phone

    elif choice == 2:
        search_name = input("\n Enter the name of the contact : ")
        if search_name in contact:
            print(search_name + "'s contact number is : " + str(contact[search_name]))
        else:
            print("\n Name is not found in the contact book")

    elif choice ==3:
        if not contact:
            print("\n Empty Contact Book")
        else:
            display_contact()

    elif choice ==4:
        edit_contact = input("\n Enter the contact to be edited : ")
        if edit_contact in contact:
            phone = int(input("Enter mobile number : "))
            contact[edit_contact] = phone
            print("Contatct Updated ")
            display_contact()

        else:
            print("Name is not found in the Contact Book ")

    elif choice ==5:
        del_contact = input("\n Enter the conatct to be deleted : ")
        if del_contact in contact:
            confirm = input("Do u want to delete this contact ? " + "\n YES or NO")
            if confirm == "yes" or "YES":
                contact.pop(del_contact)

            display_contact()
            
        else:
            print("Name is not in the Contact Book ")

    else:
        break
            
            





















            
