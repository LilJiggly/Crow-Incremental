// ===============================
// LOAD THE JSON DATA
// ===============================

// fetch() loads the JSON file
fetch("data/data.json")
  // convert the response into usable JSON
  .then((response) => {
    console.log("Response received:", response);
    return response.json();
  })

  // now we have the actual data
  .then((data) => {
    console.log("Data loaded:");
    console.log(data);

    dataList = data;

    console.log("Number of data loaded:", dataList.length);
  })

  // catch errors (important for debugging)
  .catch((error) => {
    console.error("Error loading JSON:", error);
  });

console.log("linked JS");
