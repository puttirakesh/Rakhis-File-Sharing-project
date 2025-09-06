##sum of elements in an arrays Using a loop to calculate sum
import array as ar

# Define an array of integers
my_array = ar.array('i', [1, 2, 3, 4, 5])

# Calculate the sum of the array using a loop
total = 0
for element in my_array:
    total += element
print("Sum of the array using a loop:", total)


import array as ar

total_sum = 0;
array1 = [1, 2, 3, 4, 5]
array2 = [6, 7, 8, 9, 10]

for i in range(len(array1)):
    total_sum += array1[i] + array2[i]

##a = ar.array('i',[10, 21, 12, 13])
print("sum of array: ",total_sum)

##sum of elements in an arrays Using built-in sum() function
import array as ar

my_array = ar.array('i',[6,7,8,9,10])
array_sum = sum(my_array)

print("Sum of the array using sum() built-in function:",array_sum)

##find largest Element In an Array uisng max()
import array 

my_array = ar.array('i',[10,20,30,40,50])
max_num = max(my_array)

print("maximum num in the array : ",max_num)

##find largest Element In an Array uisng loop
def find_largest_element(arr):
    if len(arr) == 0:
        return None  # Handle the case of an empty array

    max_element = arr[0]  # Assume the first element is the maximum

    for element in arr:
        if element > max_element:
            max_element = element

    return max_element

# Example usage:
my_array = [10, 4, 8, 15, 23, 42, 6]
largest_element = find_largest_element(my_array)
print("The largest element in the array is:", largest_element)



















