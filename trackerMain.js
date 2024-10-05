import satellite from "satellite.js";
let apiData1 = null;
let apiData2 = null;

// Create an async function to fetch data
async function fetchData() {
  try {
    const response = await fetch("https://tle.ivanstanojevic.me/api/tle/49260");

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    // Assign fetched data to the global variable
    apiData1 = data.line1;
    apiData2 = data.line2;

    //console.log("Data fetched and assigned to global variable:", apiData);
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
  }
}
async function mainProgram() {
  await fetchData();
  let Loclatitude = 16.043,
    Loclongitude = 45.703;

  function parseTLE(tle) {
    const lines = tle.split("\n");
    return satellite.twoline2satrec(lines[1].trim(), lines[2].trim());
  }

  function calculateDistance(satPosition, targetCoords) {
    const targetPosition = satellite.geodeticToEcf({
      latitude: targetCoords.latitude,
      longitude: targetCoords.longitude,
      height: 0, //  target is at sea level
    });
    //using the Euclidean distance formula
    const dx = satPosition.x - targetPosition.x;
    const dy = satPosition.y - targetPosition.y;
    const dz = satPosition.z - targetPosition.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function findNextClosestApproach(satrec, targetCoords, timeStep, maxSteps) {
    let minimumDistance = Number.MAX_VALUE;
    let closestPosition = null;
    let closestTime = null;

    // Get the current time and initialize it for checking future passes
    let currentTime = new Date();
    for (let i = 0; i < maxSteps; i++) {
      const time = new Date(currentTime.getTime() + i * timeStep);
      const positionAndVelocity = satellite.propagate(satrec, time);
      const gmst = satellite.gstime(time);
      const satPositionEcf = satellite.eciToEcf(
        positionAndVelocity.position,
        gmst
      );

      const distance = calculateDistance(satPositionEcf, targetCoords);

      if (distance < minimumDistance) {
        minimumDistance = distance;
        closestPosition = satellite.eciToGeodetic(
          positionAndVelocity.position,
          gmst
        );
        closestTime = time;
      }
    }

    return {
      position: closestPosition,
      distance: minimumDistance,
      time: closestTime,
    };
  }

  function main(tleData, targetCoords, timeStep, maxSteps) {
    const satrec = parseTLE(tleData);

    const result = findNextClosestApproach(
      satrec,
      targetCoords,
      timeStep,
      maxSteps
    );

    console.log("Next closest approach:");
    console.log(`Time: ${result.time.toUTCString()}`);
    console.log(
      `Position: Lat ${(result.position.latitude * 180) / Math.PI}°, Lon ${
        (result.position.longitude * 180) / Math.PI
      }°, Alt ${result.position.height} km`
    );
    console.log(`Distance: ${result.distance.toFixed(2)} km`);
  }

  // Example usage: TLE for Landsat 9 (replace this with updated TLE if necessary)
  const tle = `LANDSAT 9
${apiData1}
${apiData2}`;

  const targetCoords = {
    latitude: (Loclatitude * Math.PI) / 180, // New York City
    longitude: (Loclongitude * Math.PI) / 180,
  };

  const timeStep = 60 * 1000; // 1 minute in milliseconds
  const maxSteps = 23040; // 16 day of steps (1440 minutes in a day)

  main(tle, targetCoords, timeStep, maxSteps);
}
mainProgram();
