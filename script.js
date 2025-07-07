const apiKey = '9e82d6fc-7ab9-4f2e-a518-ffc37d9af15c';
const stopIds = ['MTA_550585', 'MTA_550572', 'MTA_551974', 'MTA_551950'];
const stopNames = {
  'MTA_550585': { name: 'Q18 – Astoria', direction: 'north' },
  'MTA_550572': { name: 'Q18 – Maspeth', direction: 'north' },
  'MTA_551974': { name: 'Q67 – Court Sq', direction: 'south' },
  'MTA_551950': { name: 'Q67 – Ridgewood', direction: 'south' },
};



async function fetchBusTimes(stopId) {
  const url = `https://corsproxy.io/?https://bustime.mta.info/api/siri/stop-monitoring.json?key=${apiKey}&MonitoringRef=${stopId}`;
  console.log('Fetching:', url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Data received for stop', stopId, data);

    const stopData = data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit;

    const stopInfo = stopNames[stopId] || { name: stopId, direction: 'north' };
    const stopTitle = stopInfo.name;
    const isSouthbound = stopInfo.direction === 'south';

    let output = `<div class="stop${isSouthbound ? ' southbound' : ''}"><h2>${stopTitle}</h2><div class="stop-divider"></div>`;


if (!stopData || stopData.length === 0) {
  output += `<p class="no-buses">No buses currently en-route</p>`;
    } else {
stopData.slice(0, 3).forEach((visit, index, array) => {
  const mvj = visit.MonitoredVehicleJourney;
  const line = mvj.LineRef;
  const routeNumber = line.split('_').pop().toUpperCase();
  const routeImage = `<img src="img/${routeNumber}.PNG" alt="${routeNumber}" style="height: 24px; vertical-align: -5.5px; margin-right: 3px;">`;


  const dest = mvj.DestinationName;

  const expectedArrival = mvj.MonitoredCall.ExpectedArrivalTime;
  const departureTime = mvj.OriginAimedDepartureTime;
  const monitored = mvj.Monitored;
  const progressStatus = mvj.ProgressStatus || '';

  const isAtTerminal = !monitored || progressStatus.includes('prevTrip') || progressStatus.includes('layover');
  const hasNoETA = !expectedArrival;


  if (isAtTerminal && hasNoETA) {
    console.log(`Skipping ${line} — at terminal with no ETA`);
    return;
  }

  const distanceRaw = mvj.Extensions?.Distances?.DistanceFromStop || 0;
  const milesAway = distanceRaw ? (distanceRaw / 1609.34).toFixed(1) : '';

  // Parse arrival time
  const arrivalDate = expectedArrival ? new Date(expectedArrival) : null;
  const now = new Date();

  let minsAway = '';

  if (arrivalDate) {
    const minutes = Math.floor((arrivalDate - now) / 60000);
    minsAway = `${minutes} min`;
  } else {
    minsAway = 'At Stop';
  }

  let details = `<p>${routeImage} <span class="minutes">${minsAway}</span>`;


  if (isAtTerminal && expectedArrival) {
    if (departureTime) {
      const depDate = new Date(departureTime);
      const now = new Date();
      if (isAtTerminal && depDate > now) {
        const depH = depDate.getHours().toString().padStart(2, '0');
        const depM = depDate.getMinutes().toString().padStart(2, '0');
        details += `<br><em>Scheduled Departure: ${depH}:${depM}</em>`;
      } else {
        details += `<br><em>Late — Scheduled Departure:</em>`;
    }
  }
}
  
  details += `</p>`;
  output += details;

  // Add divider between buses (but not after the last one)
  if (index < array.length - 1) {
    output += `<div class="bus-divider"></div>`;
  }
});


    }
    output += `</div>`
    return output;

  } catch (err) {
    console.error('Fetch failed for stop', stopId, err);
    return `<div class="stop"><h2>Stop ID: ${stopId}</h2><p>Error loading data.</p></div>`;
  }
}

async function displayBusTimes() {
  const northContainer = document.getElementById('northboundStops');
  const southContainer = document.getElementById('southboundStops');

  // Create temporary containers
  const newNorth = document.createElement('div');
  const newSouth = document.createElement('div');

  try {
    const allStopHtml = await Promise.all(stopIds.map(fetchBusTimes));

    allStopHtml.forEach((html, i) => {
      const stopId = stopIds[i];
      const direction = stopNames[stopId]?.direction || 'north';

      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;

      if (direction === 'south') {
        newSouth.appendChild(wrapper);
      } else {
        newNorth.appendChild(wrapper);
      }
    });

    // Replace content only after fully built (no flicker!)
    northContainer.replaceChildren(...newNorth.children);
    southContainer.replaceChildren(...newSouth.children);
  } catch (err) {
    console.error('Error loading bus times:', err);

    northContainer.innerHTML = '<p style="color:red">Error loading northbound stops</p>';
    southContainer.innerHTML = '<p style="color:red">Error loading southbound stops</p>';
  }
}




displayBusTimes();
setInterval(displayBusTimes, 7000);
