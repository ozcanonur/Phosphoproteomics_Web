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
    bottom_up_pathway_kinase(2, cy, target_protein, target_phosphosite, 800, 50, 50);

    event.preventDefault();
}

function bottom_up_pathway_kinase(iter, cy, target_protein, target_phosphosite, height, phosphosite_width_gap, phosphosite_height_gap){

    if(iter <= 0){
        return;
    }

    $.ajax({
        data: {
            target: target_protein,
            phosphosite: target_phosphosite,
            option: 'get_bottom_up_pathway_for_target_2',
            async: false
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data){

        // Filter duplicate kinase + phosphosites
        let set = new Set();
        for(let i = 0; i < data.length; i++){
            let kinase = data[i][1];
            let phosphosite = data[i][2];

            if(!set.has(kinase + '(' + phosphosite + ')')){
                set.add(kinase + '(' + phosphosite + ')');
            }
        }

        // Placement positions
        let current_cy_width = $('#cy-big').css('width').split('.')[0];
        let width_gap = (current_cy_width - 100) / (set.size - 1);
        let kinase_start_width = 50;

        // For every kinase affecting the current target
        for (let i = 0; i < data.length; i++, kinase_start_width += width_gap) {

            let currKinase = data[i][1];
            let currPhosphosite = data[i][2];
            let currEffect = data[i][5];
            let currPhosphorylation_type = data[i][6];

            // Phosphorylation type
            let label;
            currPhosphorylation_type === "phosphorylation" ? label = '+p' : label = '-p';

            let source = `${target_protein}(${target_phosphosite})`;

            // Check if the same phosphosite exists
            let node_exists = false;
            cy.nodes().some(function(ele) {
                if(currKinase + '(' + currPhosphosite + ')' === ele.data().id) {
                    node_exists = true;
                    kinase_start_width -= width_gap;
                }
            });

            if(!node_exists){

            }


            cy.add([
                // Place the kinase and the edge connecting to the target
                {group: 'nodes', data: {id: currKinase}, position: {x: kinase_start_width, y: height}},
                {group: 'edges',
                    data: {
                        id: source + '_to_' + currKinase,
                        source: source,
                        target: currKinase,
                        label: label
                    }
                }
            ]);

            if(currPhosphosite != null){
                cy.add([
                    // Place phosphosites on top of the kinase
                    {group: 'nodes', data: {id: currPhosphosite}, position: {x: kinase_start_width - 50, y: height - 50}},
                    {group: 'edges',
                        data: {
                            id: currKinase + '_to_' + currPhosphosite,
                            source: currKinase,
                            target: currPhosphosite
                        }
                    }
                    ]);
            }
            // Change the color of edge depending on effect:up or down
            if(currEffect.indexOf('down') === -1){
                cy.edges('[id="' + source + '_to_' + currKinase + '(' + currPhosphosite + ')' + '"]').style('line-color', 'blue');
            }

            if(currPhosphosite != null && iter > 0 && currKinase != target_protein){
                //bottom_up_pathway_kinase(iter--, cy, currKinase, currPhosphosite,
                    //height - 200, phosphosite_width_gap, phosphosite_height_gap)

            }
        }
    });

}
