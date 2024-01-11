// Import the PostgreSQL client
const { Pool } = require('pg');
const fetch = require('node-fetch'); // Import node-fetch for making HTTP requests
// import fetch from 'node-fetch';


// Create a new pool instance with your PostgreSQL configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'tayrixmicro',
  password: 'postgres',
  port: '5432' // usually 5432 for PostgreSQL
});

// Function to send query to the database
async function queryDatabase(queryText, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(queryText, params);
    return result.rows;
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
}

// Example usage: Retrieve data from a table
async function getDataFromTable() {
  try {
    const query = "SELECT * from zone_device where device_type = 'VirtualDevice'";
    const data = await queryDatabase(query);
    // const d = new Date()
    // console.log('Retrieved data:', data, d);
    data.forEach(async row => {
    const geojson = JSON.parse(row.zone_device_geo_json);
    // console.log(geojson.features[0].geometry.coordinates)
    const latd = geojson.features[0].geometry.coordinates[1];
    const long = geojson.features[0].geometry.coordinates[0];
    console.log(latd, long)
    const weatherdata = await getWeatherData(latd, long);
    console.log(weatherdata.current.temperature_2m);
    // console.log(row)
    const d = new Date()
    console.log(d.getHours()-1)
    console.log(weatherdata.hourly.dew_point_2m[d.getHours()-1])
    const weatherjson = {"zone":{"deviceid":row.id,"zoneid":row.zone_id},"Location":{"longitude":latd,"latitude":long},"metrics":{"WStemp":weatherdata.current.temperature_2m,"WShum":weatherdata.current.relative_humidity_2m,"WSvpd":weatherdata.hourly.vapour_pressure_deficit[d.getHours()-1],"WSet":weatherdata.hourly.evapotranspiration[d.getHours()-1],"WSsr":0,"WShi":weatherdata.current.apparent_temperature,"WSbp":weatherdata.current.surface_pressure,"WSsl":weatherdata.current.pressure_msl,"WSdp":weatherdata.hourly.dew_point_2m[d.getHours()-1],"WSpr":weatherdata.current.precipitation,"WSch":0,"MSTemp":0,"MSHumi":0,"MSPRE":0,"MSSMV":weatherdata.hourly.soil_moisture_0_to_1cm[d.getHours()-1],"MSSMP":0,"MSSMV_2":0,"SMP_2":0,"MSTEMPC":0,"lw":0,"fat":0,"co2":0,"fet":0,"lt":0,"frh":0,"ar":0,"fdp":0,"NI":0,"PH":0,"POT":0,"WS":weatherdata.current.wind_speed_10m,"WD":weatherdata.current.wind_direction_10m}}
    console.log(weatherjson)
    const postgresdata = [JSON.stringify(weatherjson), row.zone_id]
    insertDataIntoTable(postgresdata);
  })

  } catch (error) {
    console.error('Error retrieving data:', error);
  }
}

async function getWeatherData(latitude, longitude) {
  // const apiKey = 'YOUR_WEATHER_API_KEY'; // Replace with your weather API key
  const apiUrl = "https://api.open-meteo.com/v1/forecast?latitude="+ latitude +"&longitude="+ longitude +"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=dew_point_2m,evapotranspiration,vapour_pressure_deficit,soil_moisture_0_to_1cm&timezone=auto&forecast_days=1";
  try {
    const response = await fetch(apiUrl);
    const weatherData = await response.json();
    // console.log(weatherData)
    return weatherData; // This will contain weather information for the specified latitude and longitude
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

// Example usage: Insert data into a table
async function insertDataIntoTable(values) {
  try {
    const insertQuery = 'INSERT INTO zone_telemetry(zone_telemetry_json, zone_id) VALUES($1, $2)';
    // const values = ['value1', 'value2']; // Replace with actual values
    await queryDatabase(insertQuery, values);
    console.log('Data inserted successfully!');
  } catch (error) {
    console.error('Error inserting data:', error);
  }
}
// INSERT INTO zone_telemetry (zone_telemetry_json, zone_id, device_id) VALUES (convert_from(decode(('%s'), 'base64'), 'UTF8'), %s, %s)"

const interval = 15 * 60 * 1000; 
// 15 * 60 * 1000; 
getDataFromTable();
setInterval(getDataFromTable, interval);

// Example usage
// getDataFromTable(); // Retrieve data
// insertDataIntoTable(); // Insert data - uncomment to use

// Export necessary functions or objects
module.exports = {
  queryDatabase,
  getDataFromTable,
  insertDataIntoTable
}