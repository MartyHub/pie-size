$(function() {
    numeral.language('fr');

    var socket = io.connect();
    var data, path, size, chart, interval;

    function formatSize(size) {
        if(size >= 1073741824) {
            return numeral(size / 1073741824).format('0,0.0') + ' Gb';
        } else if(size >= 1048576) {
            return numeral(size / 1048576).format('0') + ' Mb';
        } else if(size >= 1024) {
            return numeral(size / 1024).format('0') + ' Kb';
        } else {
            return size + ' bytes';
        }
    }

    function createChart() {
        chart = new Highcharts.Chart({
            chart: {
                renderTo: 'container'
            },
            credits: {
                enabled: false
            },
            plotOptions: {
                pie: {
                    cursor: 'pointer',
                    dataLabels: {
                        formatter: function() {
                            return '<b>' + this.point.name + '</b>: ' + formatSize(this.y);
                        }
                    }
                }
            },
            series: [{
                data: [],
                events: {
                    click: function(event) {
                        var row = data[event.point.x];

                        if(row[2]) {
                            updatePath(path, row[0]);
                        }
                    }
                },
                type: 'pie'
            }],
            title: {
                text: null
            },
            tooltip: {
                formatter: function() {
                    return '<b>' + this.point.name + '</b>: ' + numeral(this.percentage).format('0.00') + ' %';
                }
            }
        });
    }

    function createPathElement(basePath, name) {
        var result = basePath + name;
        var element = document.createElement('a');

        element.textContent = name;
        element.title = result;

        if(result != path) {
            element.style.cursor = 'pointer';

            element.addEventListener('click', function(event) {
                updatePath(result);
            });
        }

        element.addEventListener('mouseover', function(event) {
            element.style.fontWeight = 'bold';
        });
        element.addEventListener('mouseout', function(event) {
            element.style.fontWeight = 'normal';
        });

        $('#header').append(element);

        return result;
    }

    function createInterval() {
        interval = setInterval(function() {
            var text = $('#header').text();
            var length = text.length;

            if(text.charAt(length - 1) == '.') {
                if(text.charAt(length - 2) == '.') {
                    if(text.charAt(length - 3) == '.') {
                        text = text.substr(0, length - 3);
                    } else {
                        text += '.';
                    }
                } else {
                    text += '.';
                }
            } else {
                text += '.';
            }

            $('#header').text(text);
        }, 1000);
    }

    socket.on('start', function(name) {
        $('#header').text('Scanning ' + name);

        createInterval();

    });

    socket.on('file', function(name, size, isFolder) {
        data.push([name, size, isFolder]);
    });

    socket.on('end', function(currentName, currentSize) {
        clearInterval(interval);

        path = currentName;
        size = currentSize;

        $('#header').text('Creating graph for ' + path);

        setTimeout(function() {
            updateChart();
        }, 50);
    });

    function updateChart() {
        chart.series[0].setData(data);
        chart.hideLoading();

        $('#header').empty();

        var basePath = createPathElement('', '/');
        var names = path.split('/');

        $.each(names, function(index, name) {
            if(name != '') {
                basePath = createPathElement(basePath, name + '/');
            }
        });

        $('#header').append(' : ' + formatSize(size));
    }

    function updatePath(basePath, lastName) {
        $('#header').empty();

        if(chart) {
            chart.destroy();
        }

        data = [];

        createChart();

        chart.showLoading();

        socket.emit('size', basePath, lastName);
    }

    updatePath();
});