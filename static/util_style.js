

function arrayOfArraysToDict(arrayList) {
    let objectList = [];

    for (let i=0;i<arrayList.length;i++){
        let array = arrayList[i];

        let object = {perturbagen:array[0], kinase:array[1], target:array[2], properties:
                {effect:array[3], perturbsScore:array[4], colocScore:array[5], uniquenessScore:array[6], finalScore:array[7]}};

        objectList.push(object);
    }

    return objectList;
}

function unique_phosphosite_count(data, index){

    let set = new Set();

    for(let i = 0; i < data.length; i++){
        let phosphosite = data[i][index];

        if(!set.has(phosphosite)){
            set.add(phosphosite);
        }
    }
    return set.size;
}

function find_spread_start_position(data, width, phosphosite_width_gap){

    // Phosphosite positions
    let unique_data_length = unique_phosphosite_count(data, 3);
    let phospho_start;

    if(unique_data_length % 2 === 0){
        phospho_start = width - (((unique_data_length / 2) - 1) * phosphosite_width_gap) - (phosphosite_width_gap / 2);
    }
    else{
        phospho_start = width - ((Math.floor(unique_data_length / 2)) * phosphosite_width_gap);
    }

    return phospho_start;
}

function add_cyto_node(cy, group, id, name, width, height, is_phosphosite){

    cy.add([
        {group: group, data: {id: id, name: name}, position: {x: width, y: height}},
    ]);

    if(is_phosphosite){

        change_cyto_style_byID(cy, 'nodes', id, 'background-color','orange');

        change_cyto_style_byID(cy, 'nodes', id, 'width', '30px');

        change_cyto_style_byID(cy, 'nodes', id, 'height', '30px');
    }
}

function add_cyto_edge(cy, group, id, name, source, target, label, is_phosphosite_edge){

    cy.add([
        {group: group,
            data: {
                id: id,
                name: name,
                source: source,
                target: target,
                label: label
            }
        }
    ]);

    if(is_phosphosite_edge){

        change_cyto_style_byID(cy, 'edges', id, 'line-color', 'orange');
    }
}

function change_cyto_style_byID(cy, element_type, id, style_property, style){

    if(element_type === 'edges'){
        cy.edges('[id="' + id + '"]').style(style_property, style);
    }
    else if(element_type === 'nodes'){
        cy.nodes('[id="' + id + '"]').style(style_property, style);
    }
}

function cyto_element_exists_byID(cy, id){

    let exists = false;
    cy.nodes().some(function(ele) {
        if(id === ele.data().id) {
            exists = true;
        }
    });

    return exists;
}
