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
