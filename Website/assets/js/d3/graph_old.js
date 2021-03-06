$(function () {
    var svg = d3.select("svg").on("click", function () {
        $("#top-nav").css("display", "none");
        $(".dropdown-menu").css("display", "none");
    }),
            width = +svg.attr("width"),
            height = +svg.attr("height"),
            link,
            node,
            labelText,
            coordData, labelIndex = 0, _linkData, _nodeData,
            edgepaths, edgelabels, showEdgeLabel = false, showEdgeSig = false, showEdgeDir = true,
            intPathRank = [], _graph = null, intFlareRank = [],
            __transform = null, EdgeDirChg = true, //For pie
            defaultEdgeColor = "#a4a4a4", //a4a4a4
            _analysis = [], sankey, path, slink,
            g = svg.append("g")
            .attr("class", "everything"),
            fileIndex = 0, fileRIndex = 0, fileCIndex = 0, dpie = false, lIndex=-1,
            zoom_handler = d3.zoom()
            .scaleExtent([1 / 10, 10])
            .on("zoom", zoom_actions),
            marker = svg.append("defs");

    zoom_handler(svg);


    var simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function (d) {
                return d.Id;
            }).strength(0.8))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2))
            //.force("x", d3.forceX(width / 2).strength(-1200))
            //.force("y", d3.forceY(height / 2).strength(-1200));
            ;

    function createButtons() {

        $("#thumbnails").css("display", "flex");

        var label = [];

        for (var i = 0; i < _graph.btn.length; i++) {
            if (label.length === 0)
                label.push(_graph.btn[i]);
            else if (label.indexOf(_graph.btn[i]) === -1)
                label.push(_graph.btn[i]);
        }


        for (var i = 0; i < label.length; i++) {
            label[i] = label[i].replace(".", "_");
            label[i] = label[i].replace(" ", "_");
            label[i] = label[i].replace("+", "_");
            label[i] = label[i].replace("-", "_");
            label[i] = label[i].replace("$", "_");
        }

        var s = "";
        if (_graph.nodes[0].pie.length > 0)
            s = "<button id='btn_Pie' >Pie chart</button>&nbsp;";

        for (var l in label) {
            s += "<button id='btn_" + label[l] + "' seq='" + l + "'>" + label[l].replace("_", " ") + "</button>&nbsp;";
        }
        $("#attr-btn").html(s);
        s = "<button id='save_image'>Save image</button>&nbsp;";

        // dev version
        s += "<button id='get_coord' title='Assign saved node position to the graph'>Restore nodes</button>&nbsp;" +
                "<button id='set_coord' title='Save node positions'>Save nodes</button>&nbsp;" +
                "<button id='set_color' title='Save colors whatever you changed'>Save colors</button>&nbsp;" +
                "<button id='color_bar' title='Color bar'>Color bar</button>&nbsp;" +
                "<button id='node_analysis' title='Explore nodes' style='display:none;'>Analysis</button>&nbsp;";

        $("#other-btn").html(s);

        d3.select("#save_image").style("color", "wheat").on("click", saveImage);
        d3.select("#btn_Pie").style("color", "wheat").on("click", createPieColorLegend);

        for (var l in label) {
            if (parseInt(l) === 0) {
                $("#btn_" + label[l]).addClass("button_bc");
            }
            $("#btn_" + label[l]).css("color", "wheat").on("click", function () {
                changeNodeColor($(this).attr("seq"), $(this));
            });
        }

        // Fir dev version
        d3.select("#get_coord").style("color", "wheat").on("click", clickGetCoordinates);
        d3.select("#set_coord").style("color", "wheat").on("click", setCoordinates);
        d3.select("#set_color").style("color", "wheat").on("click", saveColors);
        d3.select("#color_bar").style("color", "wheat").on("click", createColorBar);
        d3.select("#node_analysis").style("color", "wheat").on("click", AnalyzeNodes);
    }

    function createSubGraphLegends() {
        $("#int-cc").css("display", "block");

        $("#cc-details").html("");
        $("#cc-details").html("<ul class='cc_legend'></ul>");

        var sg = [];
        for (var li = 0; li < _linkData.length; li++) {
            if (sg.indexOf(_linkData[li].CC) === -1) {
                sg.push(_linkData[li].CC);
            }
        }

        sg.sort(function (a, b) {
            return a - b
        });

        var s = "";
        for (var i = 0; i < sg.length; i++) {
            s += "<li><input type='checkbox' r='" + sg[i] + "' name='cc' id='cc_" + sg[i] +
                    "' checked /><label class='fa' for='ip_" + sg[i] + "'>Subgraph-" + sg[i] + "</label></li>";
        }

        $(".cc_legend").html(s);

        for (var i = 0; i < sg.length; i++) {
            d3.select("#cc_" + sg[i]).on("change", showHideSubGraph);
        }
    }

    function createPathLegends() {
        $("#int-path").css("display", "block");

        $("#path-details").html("");
        $("#path-details").html("<ul class='path_legend'></ul>");

        var map = new HashMap(),
                pc_map = new HashMap();

        _linkData = $.extend(true, [], _graph.links);
        _nodeData = $.extend(true, [], _graph.nodes);
        intPathRank = [];

        for (var li = 0; li < _linkData.length; li++) {
            var d = _linkData[li];
            var r = parseInt(d.R);
            if (r && map.get(r) === null) {
                map.put(r, "<input type='text' class='color_pick' r='" + r + "' id='color_" + r + "' value='" + d.C + "'/>Path:" + r + ", Sig:" + d.L);
                intPathRank.push(r);
                pc_map.put(r, d.C);
            }
        }

        if (intPathRank.length === 0) {
            $("#int-path").css("display", "none");
            return 0;
        }

        intPathRank.sort(function (a, b) {
            return a - b
        });

        var s = "<li><input type='checkbox' id='sa' checked /><label class='fa' for='sa'>Show all edges</label></li>" +
                "<li><input type='checkbox' id='ips' /><label class='fa' for='ips'>Show only interesting paths</label></li>";
        for (var i = 0; i < intPathRank.length; i++) {
            s += "<li><input type='checkbox' r='" + intPathRank[i] + "' name='pc' id='ip_" + intPathRank[i] +
                    "' checked /><label class='fa' for='ip_" + intPathRank[i] + "'>" + map.get(intPathRank[i]) + "</label></li>";


        }

        $(".path_legend").html(s);

        for (var i = 0; i < intPathRank.length; i++) {
            $("#color_" + intPathRank[i]).spectrum({color: pc_map.get(intPathRank[i])});
            $("#color_" + intPathRank[i]).spectrum({
                change: function (c) {
                    changePathcolor(this, c.toHexString());
                }
            });
        }

        d3.select("#sa").on("change", showAllEdges);
        d3.select("#ips").on("change", showIPs);
        for (var i = 0; i < intPathRank.length; i++) {
            d3.select("#ip_" + intPathRank[i]).on("change", showHideIntPath);
        }

    }

    function createFlareLegends() {
        $("#int-flare").css("display", "block");

        $("#flare-details").html("");
        $("#flare-details").html("<ul class='flare_legend'></ul>");

        var map = new HashMap(),
                pc_map = new HashMap();

        _linkData = $.extend(true, [], _graph.links);
        _nodeData = $.extend(true, [], _graph.nodes);
        intFlareRank = [];

        if (dpie && EdgeDirChg) {
            for (var i = 0; i < _linkData.length; i++) {
                if (_linkData[i].ED === 0) {
                    var tmp = _linkData[i].source;
                    _linkData[i].source = _linkData[i].target;
                    _linkData[i].target = tmp;
                }
            }
        }

        for (var li = 0; li < _linkData.length; li++) {
            var d = _linkData[li];
            var r = parseInt(d.FR);
            if (r && map.get(r) === null) {
                map.put(r, "<input type='text' class='color_pick' r='" + r + "' id='f_color_" + r + "' value='" + d.FC + "'/>Flare:" + r);
                intFlareRank.push(r);
                pc_map.put(r, d.C);
            }
        }

        intFlareRank.sort(function (a, b) {
            return a - b
        });

        var s = "<li><input type='checkbox' id='ifs' /><label class='fa' for='ips'>Show only interesting flares</label></li>";
        for (var i = 0; i < intFlareRank.length; i++) {
            s += "<li><input type='checkbox' r='" + intFlareRank[i] + "' name='pc' id='if_" + intFlareRank[i] +
                    "' checked /><label class='fa' for='if_" + intFlareRank[i] + "'>" + map.get(intFlareRank[i]) + "</label></li>";


        }

        $(".flare_legend").html(s);

        for (var i = 0; i < intFlareRank.length; i++) {
            $("#f_color_" + intFlareRank[i]).spectrum({color: pc_map.get(intFlareRank[i])});
            $("#f_color_" + intFlareRank[i]).spectrum({
                change: function (c) {
                    changeFlarecolor(this, c.toHexString());
                }
            });
        }

        d3.select("#ifs").on("change", showIFs);
        for (var i = 0; i < intFlareRank.length; i++) {
            d3.select("#if_" + intFlareRank[i]).on("change", showHideIntFlare);
        }

        drawPie();

    }

    function createPieColorLegend() {
        selectButton($(this));

        $("#int-path").css("display", "none");
        $("#pie-legend").css("display", "block");
        $("#int-flare").css("display", "block");

        $("#pie-legend .legendhead").html("");
        $("#pie-legend .legendhead").html("<ul class='legend'></ul>");
        var s = "";
        for (var i = 0; i < _graph.indv.length; i++) {
            if (_graph.indv[i].indexOf("#") > -1) {
                var gl = _graph.indv[i].split("#");
                var gen = gl[0];
                var loc = gl[1];
                s += " <li><input type='text' class='color_pick' r='" + (i + 1) + "' id='fcolor_" + (i + 1) + "' value='" + _graph.color[i] + "'/>" + gen + "&nbsp;in&nbsp;" + loc + "</li>";
            } else {
                var gl = _graph.indv[i];
                s += " <li><input type='text' class='color_pick' r='" + (i + 1) + "' id='fcolor_" + (i + 1) + "' value='" + _graph.color[i] + "'/>" + _graph.indv[i] + "</li>";
            }
        }
        $(".legend").html(s);

        for (var i = 0; i < _graph.indv.length; i++) {
            $("#fcolor_" + (i + 1)).spectrum({color: _graph.color[i]});
            $("#fcolor_" + (i + 1)).spectrum({
                change: function (c) {
                    changeIndvcolor(this, c.toHexString());
                }
            });
        }

        createFlareLegends();
    }

    function nodeRightClick(d) {
        d3.event.preventDefault();

        d3.select("#top-nav").style("display", "none");
        d3.select(".dropdown-menu").style("display", "none");

        d3.selectAll("#top-nav ul li").remove();
        d3.select("#top-nav ul").append("li").append("a")
                .attr("href", "javascript:void(0)")
                .attr("id", "add-node")
                .text("Add node for analysis");
        d3.select("#top-nav ul").append("li").append("a")
                .attr("href", "javascript:void(0)")
                .attr("id", "remove-node")
                .text("Remove node for analysis");

        var x = 0.0, y = 0.0, k = 1.0;
        if (__transform) {
            x = __transform.x;
            y = __transform.y;
            k = __transform.k;
        }

        var __mp = d3.mouse(d3.event.currentTarget);
        var _id = d.Id;

        d3.select("#top-nav").style("display", "block")
                .style("position", "absolute")
                .style("top", (__mp[1] + y) * k + "px")
                .style("left", (__mp[0] + x) * k + "px");

        d3.select("#add-node").attr("d", d.Id)
                .on("click", function () {
                    var _id = parseInt($(this).attr("d"));
                    if (_analysis.indexOf(_id) < 0) {
                        _analysis.push(_id);

                        var _cid = "#node_" + _id;

                        d3.select(_cid).style("stroke", "#ff0000")
                                .style("stroke-width", "2px");
                    }

                    d3.select("#top-nav").style("display", "none");
                    d3.select(".dropdown-menu").style("display", "none");

                    displayAnalysis();
                });

        d3.select("#remove-node").attr("d", d.Id)
                .on("click", function () {
                    var _id = parseInt($(this).attr("d"));
                    if (_analysis.indexOf(_id) >= 0) {
                        _analysis.splice(_analysis.indexOf(_id), 1);

                        var _cid = "#node_" + _id;
                        d3.select(_cid).style("stroke", "")
                                .style("stroke-width", "0px");
                    }

                    d3.select("#top-nav").style("display", "none");
                    d3.select(".dropdown-menu").style("display", "none");

                    displayAnalysis();
                });

        d3.select(".dropdown-menu").style("display", "block");
        $("#top-nav").css("zIndex", "9999");
    }

    function displayAnalysis() {
        if (_analysis.length > 0) {
            d3.select("#node_analysis").style("display", "block");
        } else {
            d3.select("#node_analysis").style("display", "none");
        }
    }

    function intersection(a1, a2) {
        var a = [];

        if (a1.length === 0 || a2.length === 0)
            return a;

        for (var i = 0; i < a1.length; i++) {
            if (a2.indexOf(a1[i]) >= 0 && a.indexOf(a1[i]) < 0) {
                a.push(a1[i]);
            }
        }

        return a;
    }

    function getPoints(_id) {
        var a = [];
        for (var i = 0; i < _graph.nodes.length; i++) {
            if (_graph.nodes[i].Id === _id) {
                var _pt = _graph.nodes[i].Ph;
                for (var j = 0; j < _pt.length; j++) {
                    for (var k = _pt[j][0]; k <= _pt[j][1]; k++) {
                        a.push(k);
                    }
                }
            }
        }
        return a;
    }

    function AnalyzeNodes() {
        if (_analysis.length > 0) {
            var _ptHash = new HashMap();
            var _json = {'nodes': [], 'links': []};

            for (var i = 0; i < _analysis.length; i++) {
                var _lbl = null, _col=null;
                for (var g = 0; g < _graph.nodes.length; g++) {
                    if (_graph.nodes[g].Id === _analysis[i]) {
                        _lbl = _graph.nodes[g].Label;
                        _col = _graph.nodes[g].Color;
                        break;
                    }
                }
                
                var ptVal = getPoints(_analysis[i]);
                
                if (_ptHash.get(_analysis[i]) === null) {
                    _ptHash.put(_analysis[i], ptVal);
                }

                _json.nodes.push({'node': i, 'name': "node" + _analysis[i], 'NP': _ptHash.get(_analysis[i]).length, 'label':_lbl, 'Color':_col});

            }

            for (var i = 0; i < _analysis.length; i++) {
                for (var j = i + 1; j < _analysis.length; j++) {
                    var a = intersection(_ptHash.get(_analysis[i]), _ptHash.get(_analysis[j]));

                    if (a.length > 0) {
                        _json.links.push({'source': i, 'target': j, 'value': a.length});
                    }
                }
            }

            //alert(_json);

            //return 0;

            //d3.select("#data").attr("value", _json);
            //var form = $("#frm");

            if (d3.select("#modal-init")) {
                d3.select("#modal-init").style("display", "none");
            }

            vm.model.$modal();
            loadSankeyJS(_json);
        }
        
        return false;
    }

    function loadSankeyJS(graph) {
        if (graph === null)
            return;

        $("#iframe-container").html("");

        var units = "points";

// set the dimensions and margins of the graph
        var margin = {top: 10, right: 10, bottom: 10, left: 10},
                _width = (width*.8) - margin.left - margin.right,
                _height = (height*.7) - margin.top - margin.bottom;

// format variables
        var formatNumber = d3.format(",.0f"), // zero decimal places
                format = function (d) {
                    return formatNumber(d) + " " + units;
                },
                color = d3.scaleOrdinal(d3.schemeCategory20);

// append the svg object to the body of the page
        var sSvg = d3.select("#iframe-container").append("svg")
                .attr("width", _width + margin.left + margin.right)
                .attr("height", _height + margin.top + margin.bottom)
                .attr("id","tSVG")
                .append("g")
                .attr("transform",
                        "translate(" + margin.left + "," + margin.top + ")");

// Set the sankey diagram properties
        sankey = d3.sankey()
                .nodeWidth(36)
                .nodePadding(40)
                .size([_width, _height]);

        path = sankey.link();

// load the data
//d3.json("sankey.json", function(error, graph) {
        
        sankey
                .nodes(graph.nodes)
                .links(graph.links)
                .layout(32);

// add in the links
        slink = sSvg.append("g").selectAll(".link")
                .data(graph.links)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", path)
                .style("stroke-width", function (d) {
                    return Math.max(1, d.dy);
                })
                .style("fill","none")
                .style("stroke","#000")
                .style("stroke-opacity","0.2")
                .sort(function (a, b) {
                    return b.dy - a.dy;
                });

// add the link titles
        slink.append("title")
                .text(function (d) {
                    return d.source.name + " → " +
                            d.target.name + "\n" + format(d.value);
                });

// add in the nodes
        var node = sSvg.append("g").selectAll(".node")
                .data(graph.nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .call(d3.drag()
                        .subject(function (d) {
                            return d;
                        })
                        .on("start", function () {
                            this.parentNode.appendChild(this);
                        })
                        .on("drag", dragmoveSankey));

// add the rectangles for the nodes
        node.append("rect")
                .attr("height", function (d) {
                    return d.dy<=0?75:d.dy;
                })
                .attr("width", sankey.nodeWidth())
                .style("fill", function (d) {
                    return d.Color[lIndex];
                })
                .style("stroke", function (d) {
                    return d3.rgb(d.Color[lIndex]).darker(2);
                })
                .style("cursor","move")
                .style("fill-opacity","0.9")
                .style("shape-rendering","crispEdges")
                .append("title")
                .text(function (d) {
                    return d.name + "\n" + format(d.NP);
                });

// add in the title for the nodes
        node.append("text")
                .attr("x", -6)
                .attr("y", function (d) {
                    return d.dy / 2;
                })
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .attr("transform", null)
                .style("pointer-events","none")
                .style("text-shadow","0 1px 0 #fff")
                .text(function (d) {
                    return d.name + "(" + d.label[lIndex]+")";
                })
                .filter(function (d) {
                    return d.x < _width / 2;
                })
                .attr("x", 6 + sankey.nodeWidth())
                .attr("text-anchor", "start");

        
        $("#tsvg .link").hover(function(){
            $(this).css("stroke-opacity","0.5");
        });
      
    }

    // the function for moving the nodes
    function dragmoveSankey(d) {
        d3.select(this)
                .attr("transform",
                        "translate("
                        + d.x + ","
                        + (d.y = Math.max(
                                0, Math.min(height - d.dy, d3.event.y))
                                ) + ")");
        sankey.relayout();
        slink.attr("d", path);
    }

    function showAllEdges() {
        if ($(this).prop("checked") === true) {
            $("#ips").prop("checked", false);
        }

        _nodeData = $.extend(true, [], _graph.nodes);
        _linkData = $.extend(true, [], _graph.links);

        if (dpie)
            drawPie();
        else
            draw(labelIndex);
    }

    function saveColors() {
        selectButton($(this));

        var s = JSON.stringify(_graph);

        d3.select("#type").attr("value", "set-color");
        d3.select("#data").attr("value", s);
        d3.select("#folderName").attr("value", fl[fileIndex].split(".")[0]);
        d3.select("#fileName").attr("value", jfl[fileRIndex].files[fileCIndex]);
        var form = $("#frm");

        $.ajax({
            type: "POST",
            url: "dataHandler.php?" + new Date().getTime(),
            data: form.serialize(),
            success: function (json) {
                var a = 10;
            },
            error: function (request, err, ex) {
                var a = 10;
            }
        });
    }

    function showIPs() {
        if ($(this).prop("checked") === true) {
            $("#sa").prop("checked", false);
        }

        // Checked all interesting paths
        for (var i = 0; i < intPathRank.length; i++) {
            $("#ip_" + intPathRank[i]).prop("checked", true);
        }

        _nodeData = [];
        _linkData = [];
        var _nid = [];

        // Filter links and nodes
        for (var i = 0; i < _graph.links.length; i++) {
            if (_graph.links[i].R > 0) {
                _linkData.push($.extend(true, {}, _graph.links[i]));

                if (_nid.indexOf((_graph.links[i].source.Id) ? _graph.links[i].source.Id : _graph.links[i].source) === -1) {
                    _nid.push((_graph.links[i].source.Id) ? _graph.links[i].source.Id : _graph.links[i].source);
                }
                if (_nid.indexOf((_graph.links[i].target.Id) ? _graph.links[i].target.Id : _graph.links[i].target) === -1) {
                    _nid.push((_graph.links[i].target.Id) ? _graph.links[i].target.Id : _graph.links[i].target);
                }
            }
        }

        for (var i = 0; i < _graph.nodes.length; i++) {
            if (_nid.indexOf(_graph.nodes[i].Id) !== -1) {
                _nodeData.push($.extend(true, {}, _graph.nodes[i]));
            }
        }

        /*if (dpie)
         drawPie();
         else
         draw(labelIndex);*/

        draw(labelIndex);
    }

    function showIFs() {

        if ($(this).prop("checked") === true) {
            // Checked all interesting paths
            for (var i = 0; i < intFlareRank.length; i++) {
                $("#if_" + intFlareRank[i]).prop("checked", true);
            }

            _nodeData = [];
            _linkData = [];
            var _nid = [];

            // Filter links and nodes
            for (var i = 0; i < _graph.links.length; i++) {
                if (_graph.links[i].FR > 0) {
                    _linkData.push($.extend(true, {}, _graph.links[i]));

                    if (_nid.indexOf((_graph.links[i].source.Id) ? _graph.links[i].source.Id : _graph.links[i].source) === -1) {
                        _nid.push((_graph.links[i].source.Id) ? _graph.links[i].source.Id : _graph.links[i].source);
                    }
                    if (_nid.indexOf((_graph.links[i].target.Id) ? _graph.links[i].target.Id : _graph.links[i].target) === -1) {
                        _nid.push((_graph.links[i].target.Id) ? _graph.links[i].target.Id : _graph.links[i].target);
                    }
                }
            }

            for (var i = 0; i < _graph.nodes.length; i++) {
                if (_nid.indexOf(_graph.nodes[i].Id) !== -1) {
                    _nodeData.push($.extend(true, {}, _graph.nodes[i]));
                }
            }
        } else {
            _nodeData = $.extend(true, [], _graph.nodes);
            _linkData = $.extend(true, [], _graph.links);

        }
        if (dpie && EdgeDirChg) {
            for (var i = 0; i < _linkData.length; i++) {
                if (_linkData[i].ED === 0) {
                    var tmp = _linkData[i].source;
                    _linkData[i].source = _linkData[i].target;
                    _linkData[i].target = tmp;
                }
            }
        }

        drawPie();
    }

    function changePathcolor(e, col) {
        var newCol = col,
                c = parseInt($(e).attr("r"));

        for (var i = 0; i < _linkData.length; i++) {
            if (_linkData[i].R === c) {
                _linkData[i].C = newCol;
            }
        }

        for (var i = 0; i < _graph.links.length; i++) {
            if (_graph.links[i].R === c) {
                _graph.links[i].C = newCol;
            }
        }

        /*if (dpie)
         drawPie();
         else
         draw(labelIndex);*/

        draw(labelIndex);
    }

    function changeFlarecolor(e, col) {
        var newCol = col,
                c = parseInt($(e).attr("r"));

        for (var i = 0; i < _linkData.length; i++) {
            if (_linkData[i].FR === c) {
                _linkData[i].FC = newCol;
            }
        }

        for (var i = 0; i < _graph.links.length; i++) {
            if (_graph.links[i].FR === c) {
                _graph.links[i].FC = newCol;
            }
        }

        drawPie();
    }

    function changeIndvcolor(e, col) {
        var c = parseInt($(e).attr("r"));

        _graph.color[c - 1] = col;

        drawPie();
    }

    function showHideIntPath() {
        var _nid = [],
                _show = $(this).prop("checked"),
                c = parseInt($(this).attr("r")),
                _allPaths = $("#sa").prop("checked"),
                _intPaths = $("#ips").prop("checked");

        // Filter links and nodes
        if (_allPaths === true) {

            if (_show === true) {
                var col = "", wid = 0;
                for (var i = 0; i < _graph.links.length; i++) {
                    if (_graph.links[i].R === c) {
                        col = _graph.links[i].C;
                        wid = _graph.links[i].W;
                        break;
                    }
                }

                for (var i = 0; i < _linkData.length; i++) {
                    if (_linkData[i].R === c && col.length > 0 && wid > 0) {
                        _linkData[i].C = col;
                        _linkData[i].W = wid;
                    }
                }
            } else {
                for (var i = 0; i < _linkData.length; i++) {
                    if (_linkData[i].R === c) {
                        _linkData[i].C = defaultEdgeColor;
                        _linkData[i].W = 2;
                    }
                }
            }

        } else if (_intPaths === true) {
            _nodeData = [];

            if (_show === true) {

                // add missing link
                for (var i = 0; i < _graph.links.length; i++) {
                    if (_graph.links[i].R === c) {
                        _linkData.push($.extend(true, {}, _graph.links[i]));
                    }
                }

            } else {
                // remove link
                var dc = [];
                for (var i = 0; i < _linkData.length; i++) {
                    if (_linkData[i].R === c) {
                        dc.push(i);
                    }
                }

                for (var i = 0, j = 0; i < dc.length; i++, j++) {
                    _linkData.splice(dc[i] - j, 1);
                }
            }

            // Retrieve nodes for existing links only
            for (var i = 0; i < _linkData.length; i++) {
                if (_nid.indexOf((_linkData[i].source.Id) ? _linkData[i].source.Id : _linkData[i].source) === -1) {
                    _nid.push((_linkData[i].source.Id) ? _linkData[i].source.Id : _linkData[i].source);
                }
                if (_nid.indexOf((_linkData[i].target.Id) ? _linkData[i].target.Id : _linkData[i].target) === -1) {
                    _nid.push((_linkData[i].target.Id) ? _linkData[i].target.Id : _linkData[i].target);
                }
            }

            for (var i = 0; i < _graph.nodes.length; i++) {
                if (_nid.indexOf(_graph.nodes[i].Id) !== -1) {
                    _nodeData.push($.extend(true, {}, _graph.nodes[i]));
                }
            }
        }

        draw(labelIndex);
    }

    function showHideIntFlare() {
        var _nid = [],
                _show = $(this).prop("checked"),
                c = parseInt($(this).attr("r")),
                _intFlare = $("#ifs").prop("checked");


        if (_intFlare === false) {

            if (_show === true) {
                var col = "", wid = 0;
                for (var i = 0; i < _graph.links.length; i++) {
                    if (_graph.links[i].FR === c) {
                        col = _graph.links[i].FC;
                        wid = _graph.links[i].FW;
                        break;
                    }
                }

                for (var i = 0; i < _linkData.length; i++) {
                    if (_linkData[i].FR === c && col.length > 0 && wid > 0) {
                        _linkData[i].FC = col;
                        _linkData[i].FW = wid;
                    }
                }
            } else {
                for (var i = 0; i < _linkData.length; i++) {
                    if (_linkData[i].FR === c) {
                        _linkData[i].FC = defaultEdgeColor;
                        _linkData[i].FW = 2;
                    }
                }
            }

        } else {
            _nodeData = [];

            if (_show === true) {

                // add missing link
                for (var i = 0; i < _graph.links.length; i++) {
                    if (_graph.links[i].FR === c) {
                        _linkData.push($.extend(true, {}, _graph.links[i]));
                    }
                }

                if (dpie && EdgeDirChg) {
                    for (var i = 0; i < _linkData.length; i++) {
                        if (_linkData[i].ED === 0) {
                            var tmp = _linkData[i].source;
                            _linkData[i].source = _linkData[i].target;
                            _linkData[i].target = tmp;
                        }
                    }
                }

            } else {
                // remove link
                var dc = [];
                for (var i = 0; i < _linkData.length; i++) {
                    if (_linkData[i].FR === c) {
                        dc.push(i);
                    }
                }

                for (var i = 0, j = 0; i < dc.length; i++, j++) {
                    _linkData.splice(dc[i] - j, 1);
                }
            }


            // Retrieve nodes for existing links only
            for (var i = 0; i < _linkData.length; i++) {
                if (_nid.indexOf((_linkData[i].source.Id) ? _linkData[i].source.Id : _linkData[i].source) === -1) {
                    _nid.push((_linkData[i].source.Id) ? _linkData[i].source.Id : _linkData[i].source);
                }
                if (_nid.indexOf((_linkData[i].target.Id) ? _linkData[i].target.Id : _linkData[i].target) === -1) {
                    _nid.push((_linkData[i].target.Id) ? _linkData[i].target.Id : _linkData[i].target);
                }
            }

            for (var i = 0; i < _graph.nodes.length; i++) {
                if (_nid.indexOf(_graph.nodes[i].Id) !== -1) {
                    _nodeData.push($.extend(true, {}, _graph.nodes[i]));
                }
            }
        }

        drawPie();
    }

    function showHideSubGraph() {
        var _nid = [],
                _show = $(this).prop("checked"),
                c = parseInt($(this).attr("r"));

        _nodeData = [];

        // Filter links and nodes
        if (_show === true) {

            // add missing link
            for (var i = 0; i < _graph.links.length; i++) {
                if (_graph.links[i].CC === c) {
                    _linkData.push($.extend(true, {}, _graph.links[i]));
                }
            }

        } else {
            // remove link
            var dc = [];
            for (var i = 0; i < _linkData.length; i++) {
                if (_linkData[i].CC === c) {
                    dc.push(i);
                }
            }

            for (var i = 0, j = 0; i < dc.length; i++, j++) {
                _linkData.splice(dc[i] - j, 1);
            }
        }

        // Retrieve nodes for existing links only
        for (var i = 0; i < _linkData.length; i++) {
            if (_nid.indexOf((_linkData[i].source.Id) ? _linkData[i].source.Id : _linkData[i].source) === -1) {
                _nid.push((_linkData[i].source.Id) ? _linkData[i].source.Id : _linkData[i].source);
            }
            if (_nid.indexOf((_linkData[i].target.Id) ? _linkData[i].target.Id : _linkData[i].target) === -1) {
                _nid.push((_linkData[i].target.Id) ? _linkData[i].target.Id : _linkData[i].target);
            }
        }

        for (var i = 0; i < _graph.nodes.length; i++) {
            if (_nid.indexOf(_graph.nodes[i].Id) !== -1) {
                _nodeData.push($.extend(true, {}, _graph.nodes[i]));
            }
        }

        if (dpie)
            drawPie();
        else
            draw(labelIndex);
    }

    function draw(index) {
        lIndex = index;
        var linkChange = (dpie) ? true : false;
        dpie = false;
        labelIndex = index;

        if (d3.selectAll("#legends")) {
            d3.selectAll("#legends").remove();
            d3.selectAll("linearGradient").remove();
        }

        g.remove();
        g = svg.append("g").attr("class", "everything");

        $("#pie-legend").css("display", "none");
        $("#int-flare").css("display", "none");

        $("#int-path").css("display", "block");
        $("#pie-legend .logohead").html("");

        if (linkChange) {
            for (var i = 0; i < _linkData.length; i++) {
                if (_linkData[i].ED === 0) {
                    var tmp = _linkData[i].source;
                    _linkData[i].source = _linkData[i].target;
                    _linkData[i].target = tmp;
                }
            }
        }

        link = g.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(_linkData)
                .enter().append("line")
                .attr("stroke-width", function (d) {
                    return (d.W > 10) ? d.W / 2 : d.W;
                })
                .style("stroke", function (d) {
                    return d.C;
                });

        node = g.append("g")
                .attr("class", "nodes")
                .selectAll("circle")
                .data(_nodeData)
                .enter().append("circle")
                .attr("r", function (d) {
                    return d.Size;
                })
                .attr("fill", function (d) {
                    return d.Color[index];
                })
                .attr("id", function (d) {
                    return "node_" + d.Id;
                })
                .style("cursor", "pointer")
                .on('contextmenu', function (d) {
                    nodeRightClick(d);
                })
                .call(d3.drag()
                        .on("start", dragstarted)
                        .on("drag", dragged)
                        .on("end", dragended));

        node.append("title")
                .text(function (d) {
                    return d.Id+":"+d.NP;
                });

        labelText = g.append("g")
                .attr("class", "labels")
                .selectAll(".mytext")
                .data(_nodeData)
                .enter()
                .append("text")
                .text(function (d) {
                    return d.Label[index];
                })
                .attr("r", function (d) {
                    return d.Size;
                })
                .style("text-anchor", "middle")
                .style("fill", function (d) {
                    return getFontColor(d, index);
                })
                .style("font-family", "Arial")
                .style("font-weight", "bold")
                .style("cursor", "pointer")
                .style("font-size", function (d) {
                    return d.Size + "px";
                })
                .attr("dy", ".35em")
                .on('contextmenu', function (d) {
                    nodeRightClick(d);
                })
                .call(d3.drag()
                        .on("start", dragstarted)
                        .on("drag", dragged)
                        .on("end", dragended));

        // Enable below code to see edge label
        if (showEdgeLabel === true) {
            edgepaths = g.append("g")
                    .attr("class", "edgepath").selectAll(".edgepath")
                    .data(_linkData)
                    .enter()
                    .append('path')
                    .attrs({
                        'class': 'edgepath',
                        'fill-opacity': 0,
                        'stroke-opacity': 0,
                        'id': function (d, i) {
                            return 'edgepath' + i;
                        }
                    })
                    .style("pointer-events", "none");

            edgelabels = g.append("g")
                    .attr("class", "edgelabel").selectAll(".edgelabel")
                    .data(_linkData)
                    .enter()
                    .append('text')
                    .style("pointer-events", "none")
                    .attrs({
                        'class': 'edgelabel',
                        'id': function (d, i) {
                            return 'edgelabel' + i;
                        },
                        'font-size': 18,
                        'fill': '#fff'
                    });

            edgelabels.append('textPath')
                    .attr('xlink:href', function (d, i) {
                        return '#edgepath' + i
                    })
                    .style("text-anchor", "middle")
                    .style("pointer-events", "none")
                    .attr("startOffset", "50%")
                    .text(function (d) {
                        return (d.W > 6) ? ((spr) ? d.R : d.L) : "";
                    });
        }

        createLinkArrow();

        simulation
                .nodes(_nodeData)
                .on("tick", ticked);

        simulation.force("link")
                .links(_linkData);

        simulation.velocityDecay(0.07);

        if (__transform) {
            g.attr("transform", __transform);
        }

        simulation.alpha(1).restart();

        getCoordinates();

        resetFontSize();
    }

    function drawPie() {
        if (!dpie && EdgeDirChg) {
            for (var i = 0; i < _linkData.length; i++) {
                if (_linkData[i].ED === 0) {
                    var tmp = _linkData[i].source;
                    _linkData[i].source = _linkData[i].target;
                    _linkData[i].target = tmp;
                }
            }
        }
        dpie = true;



        g.remove();
        g = svg.append("g").attr("class", "everything");

        link = g.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(_linkData)
                .enter().append("line")
                .attr("stroke-width", function (d) {
                    return (d.FW > 10) ? d.FW / 2 : d.FW;
                })
                /*.attr("marker-end", function (d) {
                 return "url(#arrowhead_" + ((d.W < 5) ? 1 : 2) + ")";
                 })*/
                .style("stroke", function (d) {
                    return d.FC;
                });
        node = g.append("g")
                .attr("class", "nodes")
                .selectAll("g")
                .data(_nodeData)
                .enter().append("g")
                .attr("r", function (d) {
                    return d.Size;
                })
                .attr("id", function (d) {
                    return "node_" + d.Id;
                })
                .call(d3.drag()
                        .on("start", dragstarted)
                        .on("drag", dragged)
                        .on("end", dragended));
        node.append("title")
                .text(function (d) {
                    return d.Label[0];
                });

        // Enable below code to see edge label
        if (showEdgeLabel === true) {
            edgepaths = g.append("g")
                    .attr("class", "edgepath").selectAll(".edgepath")
                    .data(_linkData)
                    .enter()
                    .append('path')
                    .attrs({
                        'class': 'edgepath',
                        'fill-opacity': 0,
                        'stroke-opacity': 0,
                        'id': function (d, i) {
                            return 'edgepath' + i;
                        }
                    })
                    .style("pointer-events", "none");

            edgelabels = g.append("g")
                    .attr("class", "edgelabel").selectAll(".edgelabel")
                    .data(_linkData)
                    .enter()
                    .append('text')
                    .style("pointer-events", "none")
                    .attrs({
                        'class': 'edgelabel',
                        'id': function (d, i) {
                            return 'edgelabel' + i;
                        },
                        'font-size': 18,
                        'fill': '#fff'
                    });

            edgelabels.append('textPath')
                    .attr('xlink:href', function (d, i) {
                        return '#edgepath' + i;
                    })
                    .style("text-anchor", "middle")
                    .style("pointer-events", "none")
                    .attr("startOffset", "50%")
                    .text(function (d) {
                        return (d.W > 6) ? ((spr) ? d.R : d.L) : "";
                    });
        }

        createLinkArrow();

        simulation
                .nodes(_nodeData)
                .on("tick", ticked);
        simulation.force("link")
                .links(_linkData);
        simulation.velocityDecay(0.07);

        if (__transform) {
            g.attr("transform", __transform);
        }

        /* Draw the respective pie chart for each node */
        node.each(function (d) {
            var pieData = getPieData(d);
            NodePieBuilder.drawNodePie(d3.select(this), pieData[1], {
                parentNodeColor: d.Color[0],
                outerStrokeWidth: 1,
                showLabelText: false,
                labelText: pieData[0],
                labelColor: _graph.color[0]
            });
        });

        simulation.alpha(1).restart();
        getCoordinates();
    }

    function createColorBar() {
        selectButton($(this));

        var pos = [];
        var posC = [];

        node.each(function (d) {
            pos.push([d.x, d.Id]);
        });

        pos.sort(function (a, b) {
            return a[0] - b[0];
        });

        var _int = parseInt(pos.length / 5>10?pos.length / 10:pos.length / 5);

        var _ic = 0;
        for (; _ic < pos.length; _ic += _int) {
            posC.push([pos[_ic][1], "", 0.0]);
        }

        if (_ic === pos.length && _ic - _int < pos.length - 1) {
            posC.push([pos[pos.length - 1][1], "", 0.0]);
            _int++;
        }

        node.each(function (d) {
            for (var _i = 0; _i < posC.length; _i++) {
                if (posC[_i][0] === d.Id && posC[_i][1].length === 0) {
                    posC[_i][1] = d.Color[1];
                    posC[_i][2] = parseFloat(d.Label[1]);
                    break;
                }
            }
        });

        var w = $(window).width(), //pos[pos.length - 1][0] - pos[0][0], 
                h = 70;

        if (d3.selectAll("#legends")) {
            d3.selectAll("#legends").remove();
            d3.selectAll("linearGradient").remove();
        }
        var _g = svg.append("g").attr("id", "legends");

        var legend = marker
                .append("svg:linearGradient")
                .attr("id", "gradient")
                .attr("x1", "0%")
                .attr("y1", "100%")
                .attr("x2", "100%")
                .attr("y2", "100%")
                .attr("spreadMethod", "pad")
                .attr('fill', 'none')
                .style('stroke', '#000');

        for (var i = 0; i < posC.length; i++) {
            var _perc = i * 100 / (posC.length - 1);

            legend.append("stop")
                    .attr("offset", "" + _perc + "%")
                    .attr("stop-color", posC[i][1])
                    .attr("stop-opacity", 1);
        }

        _g.append("rect")
                .attr("width", w)
                .attr("height", h - 40)
                .style("fill", "url(#gradient)");

        var y = d3.scaleLinear()
                .range([w, 0])
                .domain([posC[posC.length - 1][2], posC[0][2]]);

        var yAxis = d3.axisBottom()
                .scale(y)
                .ticks(_int);

        _g.attr("class", "y axis")
                .attr("transform", "translate(0," + ($(window).height()-40)+ ")")
                .call(yAxis)
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("")
                .style("text-anchor", "middle")
                .style("fill", "#ff9189")
                .style("font-family", "Arial")
                .style("font-weight", "bold")
                .style("font-size", "20px");

        d3.selectAll("#legends text").style("fill", "#000")
                .style("font-family", "Arial")
                .style("font-weight", "bold")
                .style("font-size", "20px");
    }

    function setCoordinates() {
        selectButton($(this));

        var nPos = "{";
        node.each(function (d) {
            if (nPos.length > 1)
                nPos += ",";
            nPos += "\"nid_" + d.Id + "\":[" + d.x + "," + d.y + "]";
        });
        nPos += "}";

        d3.select("#type").attr("value", "set-coordinate");
        d3.select("#data").attr("value", nPos);
        d3.select("#folderName").attr("value", fl[fileIndex].split(".")[0]);
        d3.select("#fileName").attr("value", jfl[fileRIndex].files[fileCIndex]);
        var form = $("#frm");

        $.ajax({
            type: "POST",
            url: "dataHandler.php?" + new Date().getTime(),
            data: form.serialize(),
            success: function (json) {
                var a = 10;
            },
            error: function (request, err, ex) {
                var a = 10;
            }
        });
    }

    function createLinkArrow() {
        d3.selectAll("marker").remove();
        var i = 1;
        link.each(function (d) {
            var c = (d.target.Id) ? d.target.Id : d.target;
            var r = parseFloat(d3.select("#node_" + c).attr("r")) / 2;
            var w = (dpie) ? d.FW : d.W;
            var co = (dpie) ? d.FC : d.C;
            marker.append("marker")
                    .attr("id", "arrowhead_" + i)
                    .attr("viewBox", "-0 -5 10 10")
                    .attr("refX", (w < 5) ? r + 20 : r + 8)
                    .attr("refY", 0)
                    .attr("markerWidth", (w < 5) ? 10 : 3)
                    .attr("markerHeight", (w < 5) ? 5 : 3)
                    .attr("orient", "auto")
                    .attr("xoverflow", "visible")
                    .append("svg:path")
                    .attr("d", "M0,-5L10,0L0,5")
                    .attr('fill', co)
                    .style('stroke', 'none');

            d3.select(this).attr("marker-end", "url(#arrowhead_" + i + ")");
            i++;
        });
    }

    function getNodeCoordinate() {
        d3.select("#type").attr("value", "get-coordinate");
        d3.select("#data").attr("value", "");
        d3.select("#folderName").attr("value", fl[fileIndex].split(".")[0]);
        d3.select("#fileName").attr("value", jfl[fileRIndex].files[fileCIndex]);
        var form = $("#frm");

        $.ajax({
            type: "POST",
            url: "dataHandler.php?" + new Date().getTime(),
            data: form.serialize(),
            success: function (json) {
                if (json === "404") {
                    coordData = null;
                } else {
                    coordData = eval(json);

                    node.each(function (d) {
                        var __coord = coordData[0]["nid_" + d.Id];
                        if (__coord) {
                            d.fx = __coord[0];
                            d.fy = __coord[1];
                        }
                    });
                }
            },
            error: function (request, err, ex) {
                alert("Error to post data")
            }
        });
    }

    function clickGetCoordinates() {
        selectButton($(this));
        getCoordinates();
    }

    function getCoordinates() {

        if (coordData) {
            node.each(function (d) {
                var __coord = coordData[0]["nid_" + d.Id];
                if (__coord) {
                    d.fx = __coord[0];
                    d.fy = __coord[1];
                }
            });
        } else {
            getNodeCoordinate();
        }
    }

    function saveImage() {
        selectButton($(this));

        var html = d3.select("svg")
                .attr("version", 1.1)
                .attr("xmlns", "http://www.w3.org/2000/svg")
                .node().parentNode.innerHTML;
        var imgsrc = 'data:image/svg+xml;base64,' + btoa(html);

        var canvas = document.querySelector("canvas"),
                context = canvas.getContext("2d");

        var image = new Image;
        image.onload = function () {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0);
            var canvasdata = canvas.toDataURL("image/png");

            d3.select("canvasdata_save").remove();
            var a = document.createElement("a");
            a.download = "sample_" + (new Date().getTime()) + ".png";
            a.href = canvasdata;
            a.id = "canvasdata_save";
            document.body.appendChild(a);

            a.click();
        };
        image.src = imgsrc;
    }

    function getFontColor(d, i) {
        var c = d.Color[i];
        if (c[5] == 'f' && c[6] == 'f') {
            if (c[1] == '0' && c[2] <= '6' && c[3] <= '8')
                return "yellow";
        }

        if (c[3] <= '8' && c[5] == '0' && c[6] == '0') {
            if (c[1] == 'f' && c[2] == 'f')
                return "dark gray";
        }
        return "black";
    }

    function selectButton(e) {
        $("#attr-btn button").removeClass("button_bc");
        $("#other-btn button").removeClass("button_bc");
        $("#" + e.attr("id")).addClass("button_bc");
    }

    function changeNodeColor(index, e) {
        selectButton(e);

        lIndex = parseInt(index);
        var dr = false;
        if (dpie) {
            draw(index);
            dr = true;
        }
        k = "";
        $("#pie-legend").css("display", "none");
        $("#pie-legend .legendhead").html("");
        $("#top-nav").css("display", "none");
        node
                .attr("fill", function (d) {
                    return d.Color[index];
                });
        labelText
                .text(function (d) {
                    return d.Label[index];
                })
                .style("fill", function (d) {
                    return getFontColor(d, index);
                });
        if (!dr)
            resetFontSize();
    }

    function resetFontSize() {
        var t = $(".labels").find("*");
        t.each(function (i) {
            var _a = $(t[i]),
                    r = parseFloat(_a.attr("r")),
                    a = this.getComputedTextLength(),
                    b = (2 * r - 8) / a * 24,
                    s = Math.min(r, b) + "px";
            _a.css("font-size", s);
        });
    }

    function getPieData(d) {
        var pc = [];
        var kl = "";
        for (var i = 0; i < d.pie.length; i++) {
            var index = d.pie[i][0] - 1;
            var percentage = d.pie[i][1];

            if (kl.length > 0)
                kl += ",";
            kl += _graph.indv[index];
            pc.push({"color": _graph.color[index], "percent": percentage});
        }

        return [kl, pc];
    }

    function ticked() {
        link
                .attr("x1", function (d) {
                    return d.source.x;
                })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });
        d3.selectAll("circle")
                .attr("cx", function (d) {
                    return d.x;
                })
                .attr("cy", function (d) {
                    return d.y;
                });
        d3.selectAll(".labels text")
                .attr("x", function (d) {
                    return d.x;
                })
                .attr("y", function (d) {
                    return d.y;
                });

        if (showEdgeLabel === true) {
            edgepaths.attr('d', function (d) {
                return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
            });

            edgelabels.attr('transform', function (d) {
                if (d.target.x < d.source.x) {
                    var bbox = this.getBBox();

                    rx = bbox.x + bbox.width / 2;
                    ry = bbox.y + bbox.height / 2;
                    return 'rotate(180 ' + rx + ' ' + ry + ')';
                } else {
                    return 'rotate(0)';
                }
            });
        }

    }

    function zoom_actions() {
        $("#top-nav").css("display", "none");
        $(".dropdown-menu").css("display", "none");
        __transform = d3.event.transform;
        g.attr("transform", __transform);
    }

    function dragstarted(d) {
        $("#top-nav").css("display", "none");
        $(".dropdown-menu").css("display", "none");
        if (!d3.event.active)
            simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        $("#top-nav").css("display", "none");
        $(".dropdown-menu").css("display", "none");
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        $("#top-nav").css("display", "none");
        $(".dropdown-menu").css("display", "none");
        if (!d3.event.active)
            simulation.alphaTarget(0);
        //d.fx = null;
        //d.fy = null;
    }

    function loadData() {
        var f = "Data/json/" + fl[fileIndex].split(".")[0] + "/" + jfl[fileRIndex].files[fileCIndex];

        _nodeData = null;
        _linkData = null;
        coordData = null;
        _graph = null;

        d3.json(f + "?" + new Date().getTime(), function (error, graph) {
            if (error)
                throw error;

            _graph = graph;

            for (var i = 0; i < _graph.links.length; i++) {
                if (_graph.links[i].W === 2)
                    _graph.links[i].C = defaultEdgeColor;
                if (_graph.links[i].FW === 2)
                    _graph.links[i].FC = defaultEdgeColor;
            }

            _nodeData = $.extend(true, [], _graph.nodes);
            _linkData = $.extend(true, [], _graph.links);

            createButtons();
            draw(0);
            createPathLegends();
            createSubGraphLegends();
        });
    }

    function loadDD(filename) {
        $("#top-nav").css("display", "none");
        $(".dropdown-menu").css("display", "none");
        $("#jsonheader").css("display", "block");
        var s = "";
        for (var i = 0; i < jfl.length; i++) {
            if (jfl[i].name === filename) {
                s = "";
                for (var j = 0; j < jfl[i].files.length; j++) {
                    s += "<a href='javascript:void(0)' class='file-json-select' row='" + i + "' seq='" + j + "' title='" + jfl[i].files[j] + "'>" + jfl[i].files[j] + "</a>";
                }

                break;
            }
        }
        $("#myJsonDropdown").html(s);
        $(".file-json-select").on("click", function () {
            fileCIndex = $(this).attr('seq');
            fileRIndex = $(this).attr('row');
            var _file = jfl[fileRIndex].files[fileCIndex];
            $("#file_json_select").html(_file);
            $("#myJsonDropdown").hide();
            loadData();
        });

        // loadData();
    }

    function loadFiles() {
        $("#top-nav").css("display", "none");
        $(".dropdown-menu").css("display", "none");
        var s = "";
        for (var i = 0; i < fl.length; i++) {
            s += "<a href='javascript:void(0)' class='file-select' seq='" + i + "'>" + fl[i] + "</a>";
        }
        $("#myDropdown").html(s);
        $(".file-select").on("click", function () {
            fileIndex = $(this).attr('seq');
            var _file = fl[fileIndex];
            $("#file_select").html(_file);
            var _fileName = _file.split(".")[0];
            $("#myDropdown").hide();
            loadDD(_fileName);
        });
    }
// Close the dropdown menu if the user clicks outside of it
    window.onclick = function (event) {
        if (!event.target.matches('.dropbtn')) {

            var dropdowns = $(".dropdown-content");
            var i;
            for (i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    }

    $(".dropbtn").on("click", function () {
        $("#myJsonDropdown").hide();
        $("#myDropdown").toggle();
    });

    $(".dropjbtn").on("click", function () {
        $("#myDropdown").hide();
        $("#myJsonDropdown").toggle();
        //$("#myJsonDropdown .dropdown-content").toggleClass("show");
    });

    $(".path-show").click(function (e) {
        e.preventDefault();
        $("#int-path .row").not("#int-path .row1").slideUp();
        $("#int-path .row1").slideToggle("slow", function () {
            if ($(this).css("display") === "none") {
                $("#fa-path-title").removeClass('fa-angle-double-down');
                $("#fa-path-title").addClass('fa-angle-double-up');
            } else {
                $("#fa-path-title").removeClass('fa-angle-double-up');
                $("#fa-path-title").addClass('fa-angle-double-down');
            }

        });
    });

    $(".flare-show").click(function (e) {
        e.preventDefault();
        $("#int-flare .row").not("#int-flare .row1").slideUp();
        $("#int-flare .row1").slideToggle("slow", function () {
            if ($(this).css("display") === "none") {
                $("#fa-flare-title").removeClass('fa-angle-double-down');
                $("#fa-flare-title").addClass('fa-angle-double-up');
            } else {
                $("#fa-flare-title").removeClass('fa-angle-double-up');
                $("#fa-flare-title").addClass('fa-angle-double-down');
            }

        });
    });

    $(".cc-show").click(function (e) {
        e.preventDefault();
        $("#int-cc .row").not("#int-cc .row1").slideUp();
        $("#int-cc .row1").slideToggle("slow", function () {
            if ($(this).css("display") === "none") {
                $("#fa-cc-title").removeClass('fa-angle-double-down');
                $("#fa-cc-title").addClass('fa-angle-double-up');
            } else {
                $("#fa-cc-title").removeClass('fa-angle-double-up');
                $("#fa-cc-title").addClass('fa-angle-double-down');
            }

        });
    });

    loadFiles();

});
HashMap = function () {
    this._dict = [];
}
HashMap.prototype._get = function (key) {
    for (var i = 0, couplet; couplet = this._dict[i]; i++) {
        if (couplet[0] === key) {
            return couplet;
        }
    }

    return null;
}
HashMap.prototype.put = function (key, value) {
    var couplet = this._get(key);
    if (couplet) {
        couplet[1] = value;
    } else {
        this._dict.push([key, value]);
    }
    return this; // for chaining
}
HashMap.prototype.get = function (key) {
    var couplet = this._get(key);
    if (couplet) {
        return couplet[1];
    }
    return null;
}
HashMap.prototype.getKeys = function () {
    var keys = [];
    for (var i = 0, couplet; couplet = this._dict[i]; i++) {
        keys.push(couplet[0]);
    }

    return keys;
}