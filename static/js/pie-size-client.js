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

            if(text.length < 3) {
                text += '.';
            } else {
                text = '.';
            }

            $('#header').text(text);
        }, 1000);
    }

    socket.on('start', function(name) {
        if(chart) {
            chart.destroy();
        }

        createChart();

        chart.options.lang.loading = 'Scanning ' + name;

        chart.showLoading();
    });

    socket.on('file', function(name, size, isFolder) {
        data.push([name, size, isFolder]);
    });

    socket.on('end', function(currentName, currentSize) {
        path = currentName;
        size = currentSize;

        setTimeout(function() {
            updateChart();
        }, 50);
    });

    function updateChart() {
        chart.series[0].setData(data);
        chart.hideLoading();

        if(interval) {
            clearInterval(interval);
        }

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
        $('#header').text('...');

        createInterval();

        data = [];

        socket.emit('size', basePath, lastName, $('#noCache').attr('checked'));
    }

    $('#path').keypress(function(e) {
        if(e.which == 13) {
            updatePath($('#path').val());
        }
    });

    $('#go').click(function() {
        updatePath($('#path').val());
    });

    updatePath();
});