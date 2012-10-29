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
                            return '<strong>' + this.point.name + '</strong>: ' + formatSize(this.y);
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
                    return '<strong>' + this.point.name + '</strong>: ' + numeral(this.percentage).format('0.00') + ' %';
                }
            }
        });
    }

    function createPathElement(basePath, name) {
        var result = basePath + '/' + name;
        var element = document.createElement('a');

        element.textContent = name;
        element.title = result;

        if(result != path) {
            element.style.cursor = 'pointer';

            element.addEventListener('click', function(event) {
                updatePath(result);
            });
        }

        $('#header').append('<li>').append(element).append('<span class="divider">/</span></li>');

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

        chart.options.lang.loading = 'Loading ' + name;

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

        var element = document.createElement('a');

        element.textContent = '/';
        element.title = 'Root';
        element.style.cursor = 'pointer';
        element.addEventListener('click', function(event) {
            updatePath('/');
        });

        $('#header').append('<li>').append(element).append('<span class="divider"></span></li>');

        var basePath = '';
        var names = path.split('/');
        var lastIndex = names.length - 1;

        $.each(names, function(index, name) {
            if(name != '' && index != lastIndex) {
                basePath = createPathElement(basePath, name);
            }
        });

        $('#header').append('<li class="active">' + names[lastIndex] + '</li>');

        $('#size').text(formatSize(size));

        $('#path').focus();
    }

    function updatePath(basePath, lastName, overrideNoCache) {
        $('#header').text('...');
        $('#size').html('&nbsp;');

        createInterval();

        data = [];

        if(overrideNoCache === undefined) {
            overrideNoCache = $('#noCache').attr('checked');
        }

        socket.emit('size', basePath, lastName, overrideNoCache);
    }

    function refresh() {
        updatePath(path, undefined, true);
    }

    $('#refresh').click(function() {
        refresh();
    });

    $('#home').click(function() {
        goHome();
    });

    $('#path').keypress(function(e) {
        if(e.which == 13) {
            updatePath($('#path').val());
        }
    });

    function goHome() {
        updatePath();
    }

    $('#go').click(function() {
        updatePath($('#path').val());
    });

    $(document).keydown(function(e) {
        if(e.ctrlKey && e.altKey) {
            if(e.which == 71 && !$('#path').is(':focus')) {
                $('#path').focus();

                return false;
            } else if(e.which == 72) {
                goHome();

                return false;
            } else if(e.which == 67) {
                $('#noCache').attr('checked', !$('#noCache').attr('checked'));

                return false;
            } else if(e.which == 82) {
                refresh();

                return false;
            }
        }
    });

    updatePath();
});