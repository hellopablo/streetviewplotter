# StreetViewPlotter

[![Project Status](http://stillmaintained.com/hellopablo/streetviewplotter.png)](https://stillmaintained.com/hellopablo/streetviewplotter)

A tool for plotting points on a map and exporting streetview images. [Demo](http://hellopablo.github.io/streetviewplotter)

## How to use

Simply open up `index.html` and play away. You will need a Google Maps API Key for generating the images.

    @todo include more thorough docs, how-tos, etc.

## How to Contribute

I welcome contirbutions to streetviewplotter. Fork the repo and submit a pull request. Please ensure that streetviewplotter.js compiles and that any relevant documentation is updated before sending the pull request.

### Compiling the JS

I use Grunt to compile everything. Firstly, install `grunt-cli` tool globally. It's recommended to run the grunt client on a per-project basis.

    npm install -g grunt-cli

Install the dev dependancies in your project:

    npm install --dev
    
The following Grunt task is available for compiling the LESS into CSS and for minimising your JS:

    grunt build
    
Or, to do them individually:

	grunt build:css
	grunt build:js
	
If you want to watch for changes in \*.less and \*.js files then simply call Grunt with no arguments:

    grunt

Or, to watch only one or the other for changes:

	grunt watch:css
	grunt watch:js
	
## RoadMap

- Generally tidy this up and make it something other than a simple tool, components maybe?