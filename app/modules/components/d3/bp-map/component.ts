import Component from '@glimmer/component';
import { action } from '@ember/object';
import { json, xml } from 'd3-fetch';
import { scaleLinear } from 'd3-scale'
import Layout from 'ember-d3-demo/utils/d3/layout';
import { geoPath, geoMercator } from 'd3-geo';
import { max, min } from 'd3-array';
import { select } from 'd3-selection';
import { format, formatLocale } from 'd3-format';
import { animationType } from '../../../../utils/d3/animation';
import { iTooltip } from '../../../../utils/interface/tooltip';
import D3Tooltip from "ember-d3-demo/utils/d3/tooltip";

interface D3BpMapArgs {
    data: any[];
    tooltip: iTooltip;
    // [
    //     ["广东", 1, 73016024],
    //     ["河南", 1, 60152736],
    //     ...
    // ]
    width: number
    height: number
}

export default class D3BpMap extends Component<D3BpMapArgs> {
    private tp: iTooltip = this.args.tooltip
    @action
    initMap() {
        let layout = new Layout('.bp-map')
        let { width, height, data } = this.args
        if (width) {
            layout.setWidth(width)
        }
        if (height) {
            layout.setHeight(height)
        }
        const container = layout.getContainer()
        const tooltipIns = new D3Tooltip(container, 'map-tooltip')
        //generate svg
        const svg = layout.getSvg()
        .style('background-color', '#FAFBFC');
        // const svg = container.append('svg')
        //     .attr('width', layout.getWidth())
        //     .attr('height', layout.getHeight())
        //     .style('background-color', '#FAFBFC');

        /**
         * old method 需要手动计算scale 以及 center
         const projection = geoMercator()
            .translate([layout.getWidth() / 2, layout.getHeight() / 2])
            .scale(860).center([107, 40]);
         */
        const maxData = max(data.map((datum: any[]) => datum[2]))
        const minData = min(data.map((datum: any[]) => datum[2]))

        const color = scaleLinear().domain([0, maxData])
            .range(['#B8D4FA', '#18669A']);
        // .range(["#E7F0FE","#B8D4FA","#8ABCF4","#5CA6EF",
        //     "#3492E5",
        //     "#1E7EC8",
        //     "#18669A"
        // ])
        xml("../json/southchinasea.svg").then(xmlDocument => {
            svg.html(function () {
                return select(this).html() + xmlDocument.getElementsByTagName("g")[0].outerHTML;
            });
            const southSea = select("#southsea")

            let southSeaWidth = southSea.node().getBBox().width / 5
            let southSeaH = southSea!.node().getBBox().height / 5
            select("#southsea")
                .classed("southsea", true)
                .attr("transform", `translate(${layout.getWidth() - southSeaWidth - 24},${layout.getHeight() - southSeaH - 24}) scale(0.2)`)
                .attr("")
            return json('../json/chinawithoutsouthsea.json')
        })
            .then(geoJson => {
                const projection = geoMercator()
                    .fitSize([layout.getWidth(), layout.getHeight()], geoJson);
                const path = geoPath().projection(projection);

                const paths = svg
                    .selectAll("path.map")
                    .data(geoJson.features)
                    .enter()
                    .append("path")
                    .classed("map", true)
                    .attr("fill", "#fafbfc")
                    .attr("stroke", "white")
                    .attr("class", "continent")
                    .attr("d", path)
                    .on('mouseover', function (d: any) {
                        const curSelect = select(this);
                        curSelect.classed('path-active', true);

                        let prov = d.properties.name;
                        let curProvData: any[] = data.find((provData: any) => provData[0] === prov.slice(0, 2))

                        tooltipIns.setCurData(curProvData);
                        tooltipIns.show();
                        tooltipIns.setContent(function (data: any) {
                            console.log(data)
                            if (!data) {
                                return `<p>本市场暂无数据</p>`
                            }
                            return `
                            <p>${ data[0]} 市场概况</p>
                            <p>市场规模${formatLocale("thousands").format("~s")(data[2])}</p>
                            <p>EI ${format(".2%")(data[1])}</p>`
                        })
                    })
                    .on('mouseout', function (d: any) {
                        select(this)
                            .classed('path-active', false);

                        tooltipIns.hidden()
                        // selectAll('p').remove()
                    });

                const t = animationType();

                paths.transition(t)
                    .duration(1000)
                    .attr('fill', (d: any) => {
                        let prov = d.properties.name;
                        let curProvData = data.find((provData: any) => provData[0] === prov.slice(0, 2))

                        return color(curProvData ? curProvData[2] : 0)
                    });
                //     return xml("../json/southchinasea.svg")
            });
        // 显示渐变矩形条
        const linearGradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "linearColor")
            //颜色渐变方向
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");
        // //设置矩形条开始颜色
        linearGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", '#8ABCF4');
        // //设置结束颜色
        linearGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", '#18669A');

        svg.append("rect")
            //x,y 矩形的左上角坐标
            .attr("x", layout.getPadding().pl)
            .attr("y", layout.getHeight() - 83 - layout.getPadding().pb) // 83为矩形的高
            //矩形的宽高
            .attr("width", 16)
            .attr("height", 83)
            //引用上面的id 设置颜色
            .style("fill", "url(#" + linearGradient.attr("id") + ")");
        //设置文字

        // 数据初值
        svg.append("text")
            .attr("x", layout.getPadding().pl + 16 + 8)
            .attr("y", layout.getHeight() - layout.getPadding().pb)
            .text(0)
            .classed("linear-text", true);
        // visualMap title
        svg.append("text")
            .attr("x", layout.getPadding().pl)
            .attr("y", layout.getHeight() - 83 - layout.getPadding().pb - 8) // 8为padding
            .text('市场规模')
            .classed("linear-text", true);
        //数据末值
        svg.append("text")
            .attr("x", layout.getPadding().pl + 16 + 8)
            .attr("y", layout.getHeight() - 83 - layout.getPadding().pb + 12) // 12 为字体大小
            .text(format("~s")(maxData))
            .classed("linear-text", true)
    }
}
