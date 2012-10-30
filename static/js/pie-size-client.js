$(function() {
    numeral.language('fr');

    var socket = io.connect();
    var data, sep, path, size, chart, interval;
    var top3 = [],
        top10 = [];

    for(var i = 0; i < 10; ++i) {
        top10[i] = {
            name: '',
            size: 0
        }
    }

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
        var result = basePath + sep + name;
        var element = document.createElement('a');

        element.textContent = name;
        element.title = result;
        element.rel = "tooltip()";

        $(element).tooltip({'placement': 'bottom'});

        if(result != path) {
            element.style.cursor = 'pointer';

            element.addEventListener('click', function(event) {
                updatePath(result);
            });
        }

        $('#header').append('<li>').append(element).append('<span class="divider">' + sep + '</span></li>');

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

    socket.on('start', function(name, pathSeparator) {
        if(chart) {
            chart.destroy();
        }

        createChart();

        chart.options.lang.loading = 'Loading ' + name;

        chart.showLoading();

        path = name;
        sep = pathSeparator;

        for(var i = 0; i < 3; ++i) {
            top3[i] = {
                name: '',
                size: 0
            }
        }
    });

    socket.on('file', function(name, size, isFolder) {
        data.push([name, size, isFolder]);

        for(var i = 0; i < 3; ++i) {
            if(size > top3[i].size) {
                for(var j = 2; j > i; --j) {
                    top3[j] = top3[j - 1];
                }

                top3[i] = {
                    name: name,
                    size: size
                }

                break;
            }
        }

        for(var i = 0; i < 10; ++i) {
            var fullName = path + sep + name;

            if(size > top10[i].size) {
                for(var j = 9; j > i; --j) {
                    top10[j] = top10[j - 1];
                }

                top10[i] = {
                    name: fullName,
                    size: size
                }

                break;
            } else if(fullName == top10[i].name) {
                break;
            }
        }
    });

    socket.on('end', function(currentSize) {
        size = currentSize;

        setTimeout(function() {
            updateAll();
        }, 50);
    });

    function updateHeader() {
        var header = $('#header');

        header.empty();

        var element = document.createElement('a');

        element.textContent = sep;
        element.rel = 'tooltip';
        element.title = 'Root';
        element.style.cursor = 'pointer';
        element.addEventListener('click', function(event) {
            updatePath('/');
        });
        $(element).tooltip({'placement': 'bottom'});

        header.append('<li>').append(element).append('<span class="divider"></span></li>');

        var basePath = '';
        var names = path.split(sep);
        var lastIndex = names.length - 1;

        $.each(names, function(index, name) {
            if(name != '' && index != lastIndex) {
                basePath = createPathElement(basePath, name);
            }
        });

        header.append('<li class="active">' + names[lastIndex] + '</li>');

        $('#size').html('<strong>' + formatSize(size) + '</strong>');
    }

    function updateTop3() {
        for(var i = 1; i < 4; ++i) {
            var top = $('#top3_' + i);

            top.empty();

            if(top3[i - 1].name != '') {
                addTop(top, i, top3[i - 1]);
            }
        }
    }

    function updateTop10() {
        for(var i = 1; i < 11; ++i) {
            var top = $('#top10_' + i);

            top.empty();

            if(top10[i - 1].name != '') {
                addTop(top, i, top10[i - 1]);
            }
        }
    }

    function updateAll() {
        chart.series[0].setData(data);
        chart.hideLoading();

        if(interval) {
            clearInterval(interval);
        }

        updateHeader();
        updateTop3();
        updateTop10();

        $('#path').focus();
    }

    function addTop(id, index, top) {
        var style = ' badge-info';

        if(index == 1) {
            style = ' badge-important';
        } else if(index == 2) {
            style = ' badge-warning';
        } else if(index == 3) {
            style = ' badge-success';
        }

        var html = '<td style="text-align: center"><span class="badge';

        html += style + '">' + index + '</span></td>';
        html += '<td><small>' + top.name + '</small></td>';
        html += '<td style="text-align: right"><small>' + formatSize(top.size) + '</small></td>';

        $(id).html(html);
    }

    function updatePath(basePath, lastName, overrideNoCache) {
        $('#header').text('...');
        $('#size').html('&nbsp;');
        $('#top3').collapse('hide');

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

    $('#refresh').tooltip();
    $('#refresh').click(function() {
        refresh();
    });

    $('#home').tooltip();
    $('#home').click(function() {
        goHome();
    });

    $('#go').tooltip();

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
            if(e.which == 71) {
                $('#top3').collapse('hide');
                $('#path').select();

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
            } else if(e.which == 84) {
                $('#top3').collapse('toggle');

                return false;
            } else if(e.which == 89) {
                $('#top10').modal('toggle');

                return false;
            }
        }
    });

    updatePath();
});