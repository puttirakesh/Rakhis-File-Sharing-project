#finds the minimum element and swaps it with the first element
#time complexity is O(n^2) = for all cases

def selectionsort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i+1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j

        arr[i], arr[min_idx] = arr[min_idx], arr[i] #swap
    return arr

arr = [15,2,55,35,88,92,37]
print("Original array :: ", arr)

selectionsort(arr)
print("Sorted array : ", arr)