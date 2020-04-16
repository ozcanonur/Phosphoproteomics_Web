function bottom_up_pathway(event){

    // Empty the graph container and adjust buttons etc.
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

    // End target
    let target_protein = 'DPYSL3';
    let target_phosphosite = 'Thr509';

    // Dimensions of the cy container
    let current_cy_width = $('#cy-big').css('width').split('.')[0];
    let current_cy_height = $('#cy-big').css('height').split('.')[0];

    // Add the end target node
    cy.add([
        {group: 'nodes', data: {id: `${target_protein}(${target_phosphosite})`}, position: {x: current_cy_width / 2, y: current_cy_height - 50}}
    ]);

    // Go first round of 'up'
    bottom_up_pathway_kinase(5, cy, target_protein, target_phosphosite, 800, 50, 50);

    event.preventDefault();
}

function bottom_up_pathway_kinase(iter, cy, target_protein, target_phosphosite, height, phosphosite_width_gap, phosphosite_height_gap){

    if(iter === 0){
        return;
    }

    $.ajax({
        data: {
            target: target_protein,
            phosphosite: target_phosphosite,
            option: 'get_bottom_up_pathway_for_target'
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data){

        // Placement positions
        let current_cy_width = $('#cy-big').css('width').split('.')[0];
        let width_gap = (current_cy_width - 100) / (data.length - 1);
        let kinase_start_width = 50;

        // For every kinase affecting the current target
        for (let i = 0; i < data.length; i++, kinase_start_width += width_gap) {

            let currKinase = data[i][0];
            let currEffect = data[i][1];
            let currPhosphorylation_type = data[i][2];

            // Phosphorylation type
            let label;
            currPhosphorylation_type === "phosphorylation" ? label = '+p' : label = '-p';

            let source;
            if(height === 800){
                source = `${target_protein}(${target_phosphosite})`;
            }
            else{
                source = target_phosphosite;
            }

            // Place the kinase and the edge connecting to the target
            cy.add([
                {group: 'nodes', data: {id: currKinase}, position: {x: kinase_start_width, y: height}},
                {group: 'edges',
                    data: {
                        id: target_phosphosite + '_to_' + currKinase,
                        source: source,
                        target: currKinase,
                        label: label
                    }
                }
            ]);

            // Change the color of edge depending on effect:up or down
            if(currEffect.indexOf('down') === -1){
                cy.edges('[id="' + target_phosphosite + '_to_' + currKinase + '"]').style('line-color', 'blue');
            }

            // Put phosphosites
            let list = bottom_up_pathway_phosphosites(cy, currKinase, kinase_start_width, height, phosphosite_width_gap, phosphosite_height_gap);

            list.forEach(function(phosphosite){
                bottom_up_pathway_kinase(iter--, cy, currKinase, phosphosite, height - 200, phosphosite_width_gap, phosphosite_height_gap)
            });
        }
    });

}

function bottom_up_pathway_phosphosites(cy, kinase, width, height, phosphosite_width_gap, phosphosite_height_gap){

    let list = [];
    $.ajax({
        data: {
            target: kinase,
            phosphosite: 'all',
            option: 'get_bottom_up_pathway_for_target',
            async: false
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data) {

        // Find the phosphosites' start positions
        let phospho_start = find_spread_start_position(data, width, phosphosite_width_gap);

        // Add phosphosites on top of currently affected kinase
        for (let i = 0; i < data.length; i++, phospho_start += phosphosite_width_gap){

            let currPhosphosite = data[i][3];
            if(!list.includes(currPhosphosite)){
                list.push(currPhosphosite);
            }

            // Check if the same phosphosite exists
            let node_exists = false;
            cy.nodes().some(function(ele) {
                if(currPhosphosite === ele.data().id) {
                    node_exists = true;
                    phospho_start -= 50;
                }
            });

            // Add new unique phosphosite node and connect it to the kinase
            if(!node_exists){
                cy.add([
                    {group: 'nodes', data: {id: currPhosphosite}, position: {x: phospho_start, y: height - phosphosite_height_gap}},
                    {group: 'edges',
                        data: {
                            id: kinase + '_to_' + currPhosphosite,
                            source: kinase,
                            target: currPhosphosite
                        }
                    }
                ]);

                // Phosphosite node styling
                cy.nodes('[id="' + currPhosphosite + '"]').style('width', '30px');
                cy.nodes('[id="' + currPhosphosite + '"]').style('height', '30px');
                cy.nodes('[id="' + currPhosphosite + '"]').style('font-size', '12pt');
                cy.nodes('[id="' + currPhosphosite + '"]').style('background-color', 'orange');
                cy.edges('[id="' + kinase + '_to_' + currPhosphosite + '"]').style('line-color', 'orange');

            }

        }

    });

    return list;
}
