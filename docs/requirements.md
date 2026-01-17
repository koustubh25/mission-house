# Requirements

The app will have to minimum 2 pages

### Data Entry page

1. This page will have a simple input text box which will accept a realestate.com.au link and a `submit` button
2. Once the user clicks on `submit`. a webscraper will run and execute and populate the DB. In this case, just a simple JSON file i.e. no actual DB running. This JSON file will be committed to the repo.
3. The data entry page is only meant to be run locally i.e. when it runs on `localhost` or `127.0.0.1` and should not be visible when running on github.io
4. Refer the wireframe [dataentry.png](img/dataentry.png)
5. I can provide you the outerHTML content for you to be able extract contents before putting it in the DB (JSON file)

### Database (JSON file)

This will be a simple JSON file with the following schema:

1. Address
2. Rooms - e.g. number of bedrooms, number of bathrooms, garage space etc.
3. Price (almost always available as range)
4. Auction date (if applicable)
5. Area

Refer the wireframe [dataentrywithdb](img/dataentrywithdb.png)

### Data View page

1. This is the most important page where the user makes all the decisions to buy a house.
2. At the centre, it will have a dropdown which also accepts text. This is the place where you either enter a google maps location (of the house property) or you can choose an address from the addresses available in the DB populated through the data entry page i.e the JSON file.
3. Once this is selected, the following is displayed about the property at this address
   i. The primary school name that lies in the catchment area and should also display approx walking time and distance to the school
   ii. The primary school name that lies in the catchment areacatchment area and should also display approx walking time and distance to the school
   iii. The nearest train station name. It should also display the commute methods with time for each of the methods, e.g. bus, car, walking. You should be able to get all of this from google maps.
   iv. Time required to reach "Flinders Street Station" in Melbourne from
   a. the nearest train station (as identified in 3.iii) during peak hours on a working day.
   b. The original property address itself i.e. input at 2. Again during peak hours on a working day.
4. Refer [dataview.png](./img/dataview.png)

## Constraints

1. I don't have a server to run this application. So make this a purely frontend app i.e. just JS making web api calls.
2. Since there is not backend, just use a JSON file as the backend which the user will commit to the github repository.
3. This app will be hosted on koustubh25.github.io
4. Make this app with a fancy UI i.e. make it as artistic as you can.
5. I live in Melbourne, Australia. So this is all about Melbourne suburbs.
