
# Climb

Simple app made using D3.js to help cyclists compare climbs with respect to distance ridden and elevation.

## Development

To add new climbs, all one has to do is find the id of the respective segment in Strava and download it by using the following command line:

    curl -X GET 'https://www.strava.com/stream/segments/<SEGMENT_ID>?streams%5B%5D=distance&streams%5B%5D=altitude'

And replacing `<SEGMENT_ID>` with the id found on Strava. Save the response to some file and you're done.
