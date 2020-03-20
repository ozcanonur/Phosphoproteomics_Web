function pathway_triggers() {

    $('#pathwayBtn').on('click', function(event) {
        $('#cy-big-PKinfo').html('');
        show_pathway(event);
    });

    $('#pathwaySlider').on('input', function(event) {
        show_pathway(event);
    });

    $('#secondaryPathwayBtn').on('click', function(event){
        $('#cy-big-PKinfo').html('');
        bottom_up_pathway(event);
    })
}

function show_pathway(event){

    $('#cy-big').css('visibility', 'visible');
    $('#cy-big').css('height', '1000px');

    $('#cy-big-PKinfo').css('visibility', 'visible');
    $('#cy-big-PKinfo').css('height', '1000px');

    $('#kinase-pathway-title').css('visibility', 'visible');
    $('#kinase-pathway-title').css('visibility', 'visible');
    $('#kinase-pathway-title').css('height', '');
    $('#kinase-pathway-title').css('padding', '10px');

    // Create a cytoscape graph instance
    let cy = cytoScapeStyle('cy-big');
    let kinase = $('#kinaseSelect').val();

    if(kinase == 'Kinase'){
        kinase = 'MTOR';
    }

    $.ajax({
        data: {
            kinase: kinase,
            option: 'get_pathway_for_kinase'
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data) {

        let current_cy_width = $('#cy-big').css('width').split('.')[0];
        let start_node_width = current_cy_width / 2;

        cy.add([
            {group: 'nodes', data: {id: kinase}, position: {x: start_node_width, y: 50}}
        ]);

        ajax_pathway_PK(cy, kinase, 200, 50);

        let width = 50;
        for (let i = 0; i < data.length; i++, width += 130) {

            let currKinase = data[i][0];
            let score = data[i][1].toFixed(3);

            let kt_slider_value = $('#pathwaySlider').val();

            if(score < kt_slider_value) {
                width -= 130;
                continue;
            }

            cy.add([
                {group: 'nodes', data: {id: currKinase}, position: {x: width, y: 300}},
                {group: 'edges',
                    data: {
                        id: kinase + '_to_' + currKinase,
                        source: kinase,
                        target: currKinase,
                        label: score
                    }
                }
            ]);

            ajax_pathway_PK(cy, currKinase, width, 300);
            ajax_next_row_kinases(cy, currKinase, 50, 550, 10, kinase);
        }
    });

    event.preventDefault();
}

function ajax_pathway_PK(cy, kinase, width, height){

    let ajax_kinase = kinase;
    if(kinase.split('(').length = 2) {
        ajax_kinase = kinase.split('(')[0];
    }

    // Add P-K
    $.ajax({
        data: {
            kinase: ajax_kinase,
            option: 'get_pathway_for_PK'
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data) {

        if(data.length != 0) {

            // // Adding new P nodes for K
            // let perturbagen = data[0][0];
            // let score = data[0][1].toFixed(3);
            //
            // cy.add([
            //     {group: 'nodes', data: {id: perturbagen}, position: {x: width + 150, y: height}},
            //     {group: 'edges',
            //         data: {
            //             id: kinase + '_to_' + perturbagen,
            //             source: kinase,
            //             target: perturbagen,
            //             label: score
            //         }
            //     }
            // ]);
            //
            // cy.nodes('[id="' + perturbagen + '"]').style('shape', 'ellipse');
            // cy.nodes('[id="' + perturbagen + '"]').style('background-color', 'red');
            // cy.nodes('[id="' + perturbagen + '"]').style('color', 'white');

            cy.nodes('[id="' + kinase + '"]').style('background-color', 'red');

            // Triggers on clicking the target node, populates the info pane with P-K interactions
            cy.on('tap', 'node', function (event) {

                if(event.target.id() === kinase) {

                    $('#cy-big-PKinfo').html('');

                    let list = document.createElement('ul');

                    for(let i=0; i < data.length;i++){

                        let perturbagen = data[i][0];
                        let score = data[i][1].toFixed(3);

                        let item = document.createElement('li');
                        let content = '<a class="pathway_PKT" href="#"><span style="font-weight:bold;">' + perturbagen + '</span>' +
                            ' > ' + kinase + ': ' +
                            '<span style="font-weight:bold; color:red;">' + score + '</span>' +
                        '</a>';

                        item.innerHTML = content;
                        list.appendChild(item);
                    }

                    $('#cy-big-PKinfo').append(list);

                    show_cyto_PKT_pathway();
                }
            });
        }
    });
}

function ajax_next_row_kinases(cy, kinase, width, height, iter, original_kinase){

    // TODO Infinite loop fix, still need to fix it for all rows
    if(kinase.split('(')[0] === original_kinase || iter === 0){
        return;
    }

    // Get further down kinases
    $.ajax({
        data: {
            kinase: kinase.split('(')[0],
            option: 'get_pathway_for_kinase'
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data) {

        for (let i = 0; i < data.length; i++, width += 130) {

            let currKinase = data[i][0];
            let score = data[i][1].toFixed(3);

            let kt_slider_value = $('#pathwaySlider').val();
            if(score < kt_slider_value) {
                width -= 130;
                continue;
            }

            // Visual clarity
            if(cy.nodes('[id="' + currKinase + '"]').length === 1){
                width -= 130;
            }

            // Node visual overlap fix
            cy.nodes().some(function(ele) {
                if(width == ele.position().x && height == ele.position().y) {
                    width += 130;
                    return;
                }
            });

            cy.add([
                {group: 'nodes', data: {id: currKinase}, position: {x: width, y: height}},
                {group: 'edges',
                    data: {
                        id: kinase + '_to_' + currKinase,
                        source: kinase,
                        target: currKinase,
                        label: score
                    }
                }
            ]);

            ajax_pathway_PK(cy, currKinase, width, height);
            ajax_next_row_kinases(cy, currKinase, 50, height + 250, iter--);
        }
    });

    return;
}

function show_cyto_PKT_pathway() {

    $(".pathway_PKT").on('click', function(event) {

        // Create a cytoscape graph instance
        let cy = cytoScapeStyle('cy');

        let clicked_link = $(event.target);

        let content;
        if(clicked_link.text().includes(':')){
            content = clicked_link.text();
        }
        else{
            content = clicked_link.parent().text();
        }

        let perturbagen = content.split(' > ')[0];
        let kinase = content.split(' > ')[1].split(':')[0];
        if(kinase.split('(').length === 2){
            kinase = kinase.split('(')[0];
        }

        show_PKT(cy, perturbagen, kinase);

        event.preventDefault();

    });
}

function secondary_ajax_next_row_kinases(cy, kinase, width, height, iter, original_kinase){

    // TODO Infinite loop fix, still need to fix it for all rows
    if(kinase.split('(')[0] === original_kinase || iter === 0){
        return;
    }

    // Get further down kinases
    $.ajax({
        data: {
            target: kinase,
            phosphosite: 'all',
            option: 'get_secondaryPathway_for_target',
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data) {

        for (let i = 0; i < data.length; i++, width += 130) {

            let currKinase = data[i][0];

            let phospho_start = width - 100;

            // Add phosphosites on top of currently affected kinase
            for (let ii = 0; ii < data.length; ii++, phospho_start += 50){

                let currPhosphosite = data[ii][3];
                let node_id = currPhosphosite;

                let node_exists = false;
                cy.nodes().some(function(ele) {
                    if(currPhosphosite == ele.data().id) {
                        node_exists = true;
                        phospho_start -= 50;
                    }
                });

                if(!node_exists){
                    cy.add([
                        {group: 'nodes', data: {id: node_id}, position: {x: phospho_start, y: height}},
                        {group: 'edges',
                            data: {
                                id: kinase + '_to_' + node_id,
                                source: kinase,
                                target: node_id
                            }
                        }
                    ]);

                    cy.nodes('[id="' + node_id + '"]').style('width', '30px');
                    cy.nodes('[id="' + node_id + '"]').style('height', '30px');
                    cy.nodes('[id="' + node_id + '"]').style('font-size', '12pt');
                    cy.nodes('[id="' + node_id + '"]').style('background-color', 'orange');
                    cy.edges('[id="' + kinase + '_to_' + node_id + '"]').style('line-color', 'orange');
                }

                // x(cy, kinase, currPhosphosite, iter--);
            }


        }
    });

    return;
}


function x(cy, target, phosphosite){

    $.ajax({
        data: {
            target: target,
            phosphosite: phosphosite,
            option: 'get_secondaryPathway_for_target'
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data) {

        let target_with_phosphosite = target + '(' + phosphosite + ')';

        let current_cy_width = $('#cy-big').css('width').split('.')[0];
        let start_node_width = current_cy_width / 2;

        cy.add([
            {group: 'nodes', data: {id: target_with_phosphosite}, position: {x: start_node_width, y: 950}}
        ]);

        let width = 150;
        let height = 700;

        for (let i = 0; i < data.length; i++, width += 350) {

            let currKinase = data[i][0];
            let currEffect = data[i][1];
            let currPhosph = data[i][2];

            let label;
            if(currPhosph == "phosphorylation"){
                label = '+p';
            }
            else{
                label = '-p';
            }

            cy.add([
                {group: 'nodes', data: {id: currKinase}, position: {x: width, y: height}},
                {group: 'edges',
                    data: {
                        id: target_with_phosphosite + '_to_' + currKinase,
                        source: target_with_phosphosite,
                        target: currKinase,
                        label: label
                    }
                }
            ]);

            if(currEffect.indexOf('down') === -1){
                cy.edges('[id="' + target_with_phosphosite + '_to_' + currKinase + '"]').style('line-color', 'blue');
            }

            secondary_ajax_next_row_kinases(cy, currKinase, width, height - 50, 10);
        }
    });
}

function show_secondaryPathway(event){

    $('#cy-big').css('visibility', 'visible');
    $('#cy-big').css('height', '1000px');

    $('#cy-big-PKinfo').css('visibility', 'visible');
    $('#cy-big-PKinfo').css('height', '1000px');

    $('#kinase-pathway-title').css('visibility', 'visible');
    $('#kinase-pathway-title').css('visibility', 'visible');
    $('#kinase-pathway-title').css('height', '');
    $('#kinase-pathway-title').css('padding', '10px');

    // Create a cytoscape graph instance
    let cy = cytoScapeStyle('cy-big');

    let target = 'DPYSL3';
    let phosphosite = 'Thr509';

    x(cy, target, phosphosite);

    event.preventDefault();
}