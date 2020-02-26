function filter_kinase() {

    // Triggers when a perturbagen is selected
    $('#perturbagenSelect').on('change', function(event) {

		$.ajax({
			data : {
				perturbagen : $('#perturbagenSelect').val(),
                option: 'filter_kinase'
			},
			type : 'POST',
			url : '/process_ajax'
		})
		.done(function(data) {
            // Add kinases to the dropdown where the selected perturbagen has an interaction
		    $('#kinaseSelect').empty();
		    $('#kinaseSelect').append(new Option('Kinase', 'Kinase'));
			for (let i=0;i<data.length;i++) {
			    currKinase = data[i][0];
			    $('#kinaseSelect').append(new Option(currKinase, currKinase));
            }
		});

		event.preventDefault();
	});
}

function show_PKT(cy, perturbagen, kinase){

    $.ajax({
        data: {
            perturbagen: perturbagen,
            kinase: kinase,
            option: 'get_PKT'
        },
        type: 'POST',
        url: '/process_ajax'
    })
    .done(function (data) {

        let current_cy_width = $('#cy').css('width').substring(0,3);
        let kinase_width = (current_cy_width - 100) / 2;
        let perturbagen_width = current_cy_width - 50;

        // Add perturbagen, kinase nodes and an edge
        cy.add([
            {group: 'nodes', data: {id: perturbagen}, position: {x: 50, y: 50}},
            {group: 'nodes', data: {id: kinase}, position: {x: kinase_width, y: 50}},
            {group: 'edges', data: {id: perturbagen + 'to' + kinase, source: perturbagen, target: kinase}}
        ]);

        cy.nodes('[id="' + kinase + '"]').style('shape', 'square');

        // Go through all targets that has an interaction with
        // the selected P and K, create nodes and edges for them
        let height = 50;
        for (let i = 0; i < data.length; i++, height += 75) {

            let currTarget = data[i][2];
            let currUporDown = data[i][3];
            let finalScore = data[i][7].toFixed(6);
            let edgeID = 'e' + i;

            cy.add([
                {group: 'nodes', data: {id: currTarget}, position: {x: perturbagen_width, y: height}},
                {group: 'edges', data: {id: edgeID, source: kinase, target: currTarget, label: finalScore}}
            ]);

            cy.nodes('[id="' + currTarget + '"]').style('shape', 'ellipse');

            if (currUporDown == 'up') {
                cy.edges('[id = "' + edgeID + '"]').style('line-color', '#369');
            }
        }

        // Save the PKT interactions to the session cache
        let storage = JSON.stringify(arrayOfArraysToDict(data));
        sessionStorage.setItem('PKT_Data', storage);

        storage = JSON.parse(sessionStorage.getItem('PKT_Data'));
        let index = storage.findIndex(storage => storage.target == data[0][2]);
        displayInfo_PKT(storage, index);

        // Triggers on clicking the target node, populates the info pane
        cy.on('tap', 'node', function () {

            if (this.relativePoint().x == perturbagen_width) {

                // Retrieve info from the cache
                let storage = JSON.parse(sessionStorage.getItem('PKT_Data'));
                let index = storage.findIndex(storage => storage.target == this.id());

                displayInfo_PKT(storage, index);
            }
        });

    });
}

function show_cyto_PKT() {

    // Triggers when a kinase and perturbagen is selected
    $('#kinaseSelect').on('change', function() {

        // Create a cytoscape graph instance
        let cy = cytoScapeStyle('cy');

        let perturbagen = $('#perturbagenSelect').val();
        let kinase = $('#kinaseSelect').val();

        // $('#cy').css('visibility', 'visible');
        // $('#cy').css('height', '610px;');

        show_PKT(cy, perturbagen, kinase);

    });
}

function displayInfo_PKT(storage, index){

    $('#perturbagenInfoID').html(storage[index].perturbagen);
    $('#kinaseInfoID').html(storage[index].kinase);
    $('#targetInfoID').html(storage[index].target);
    $('#effectInfoID').html(storage[index].properties.effect);
    $('#perturbsScoreInfoID').html(storage[index].properties.perturbsScore.toFixed(4));
    $('#colocalisationInfoID').html(storage[index].properties.colocScore.toFixed(4));
    $('#uniquenessInfoID').html(storage[index].properties.uniquenessScore.toFixed(4) + ' (See below)');
    $('#finalScoreInfoID').html(storage[index].properties.finalScore.toFixed(4));
    $('#kinaseSimilarityID').html('Shared P << >> Shared T');
}

function show_perturbs_details() {

    $('#perturbsScoreInfoID').on('click', function(event) {

        let storage = JSON.parse(sessionStorage.getItem('PKT_Data'));
        let target = $('#targetInfoID').text();
        let index = storage.findIndex(storage => storage.target == target);

		$.ajax({
			data : {
				perturbagen : storage[index].perturbagen,
                target: storage[index].target,
                option: 'get_perturbs_details'
			},
			type : 'POST',
			url : '/process_ajax'
		})
		.done(function(data) {

		    let fold_change = data[0][2].toFixed(6);
		    let p_value = data[0][3].toFixed(6);
            let final_score = $('#finalScoreInfoID').text();

		    let details_fold = '<div>Fold change: <a>' + fold_change + '</a></div>';
            let details_pValue = '<div>P value: <a>' + p_value + '</a></div>';
            let calculation = '<div>Calculation: <a>1 - ((p / 0.05) ^ |fc|)</a></div>';

            $('#detailedInfo').html(details_fold + details_pValue + calculation);
		});

		event.preventDefault();
	});
}

function show_coloc_details() {

    $('#colocalisationInfoID').on('click', function(event) {

		$.ajax({
			data : {
				kinase : $('#kinaseInfoID').text(),
                target: $('#targetInfoID').text(),
                option: 'get_coloc_details'
			},
			type : 'POST',
			url : '/process_ajax'
		})
		.done(function(data) {

		    let kinase = data[0][0];
		    let target = data[0][1];

		    let ksec = data[0][3].toFixed(3);
		    let knuc = data[0][4].toFixed(3);
		    let kcyt = data[0][5].toFixed(3);
		    let kmit = data[0][6].toFixed(3);

		    let psec = data[1][3].toFixed(3);
		    let pnuc = data[1][4].toFixed(3);
		    let pcyt = data[1][5].toFixed(3);
		    let pmit = data[1][6].toFixed(3);

		    let header = '<div style="text-align:center;font-weight: bold;">Colocalisation</div>'
		    let table = `<table class="table"><tr><th></th><th>Sec</th><th>Nuc</th><th>Cyt</th><th>Mito</th></tr>
                <tr><th>${kinase}</th><th>${ksec}</th><th>${knuc}</th><th>${kcyt}</th><th>${kmit}</th></tr>
                <tr><th>${target}</th><th>${psec}</th><th>${pnuc}</th><th>${pcyt}</th><th>${pmit}</th></tr>
                </table>`;

		    let calculation = '<div style="font-size:8px">Colocalisation Score: (k<sub>sec</sub>*t<sub>sec</sub>) + ' +
                '(k<sub>nuc</sub>*t<sub>nuc</sub>) + (k<sub>cyt</sub>*t<sub>cyt</sub>) + ' +
                '(k<sub>mito</sub>*t<sub>mito</sub>)</div>';

            $('#detailedInfo').html(header + table + calculation);
		});

		event.preventDefault();
	});
}

function show_uniqueness_details() {

    $('#uniquenessInfoID').on('click', function(event) {

        let cy = cytoScapeStyle('cy2');

        $.ajax({
            data: {
                target: $('#targetInfoID').text(),
                option: 'get_uniqueness_details'
            },
            type: 'POST',
            url: '/process_ajax'
        })
        .done(function (data) {

            let target = data[0][1];

            let current_cy_width = $('#cy2').css('width').substring(0,3);
            let target_width = current_cy_width - 50;

            cy.add([
                {group: 'nodes', data: {id: target}, position: {x: target_width, y: 50}},
            ]);

            cy.nodes('[id="' + target + '"]').style('shape', 'ellipse');

            let height = 50;
            for (let i = 0; i < data.length; i++, height += 75) {

                let currKinase = data[i][0];
                let currProb = data[i][2].toFixed(6);
                let edgeID = 'e' + i;

                cy.add([
                    {group: 'nodes', data: {id: currKinase}, position: {x: 50, y: height}},
                    {group: 'edges', data: {id: edgeID, source: currKinase, target: target, label: currProb}}
                ]);

                cy.nodes('[id="' + currKinase + '"]').style('shape', 'square');
            }

            let kinase = $('#kinaseInfoID').text();
            cy.nodes('[id = "' + kinase + '"]').style('background-color', '#ff0000');
        });

        event.preventDefault();
    });
}

function show_kinase_similarity_details() {

    $('#kinaseSimilarityID').on('click', function(event) {

        let cy = cytoScapeStyle('cy3');
        let kinase = $('#kinaseInfoID').text();

        let current_cy_width = $('#cy3').css('width').substring(0,3);
        let current_cy_height = $('#cy3').css('height').substring(0,3);
        let kinase_width = current_cy_width / 2;
        let kinase_height = current_cy_height / 2;

        cy.add([
            {group: 'nodes', data: {id: kinase}, position: {x: kinase_width, y: kinase_height}},
        ]);

        cy.nodes('[id = "' + kinase + '"]').style('background-color', '#ff0000');

		$.ajax({
			data : {
				kinase : kinase,
                option: 'get_kinase_similarity_perturbagen_details'
			},
			type : 'POST',
			url : '/process_ajax'
		})
		.done(function(data) {

            let height = 50;
            for (let i = 0; i < data.length; i++, height += 50) {

                let currKinase = data[i][1];
                let currRatio = data[i][4].toFixed(2) + ', S(' + data[i][2] + '), ' + 'T(' + data[i][3] + ') ';
                let edgeID = 'e' + i;

                cy.add([
                    {group: 'nodes', data: {id: currKinase}, position: {x: 50, y: height}},
                    {group: 'edges', data: {id: edgeID, source: kinase, target: currKinase, label: currRatio}}
                ]);

                cy.nodes('[id="' + currKinase + '"]').style('shape', 'square');
                cy.edges('[id = "' + edgeID + '"]').style('line-color', '#ff0000');
            }
		});

		$.ajax({
			data : {
				kinase : kinase,
                option: 'get_kinase_similarity_target_details'
			},
			type : 'POST',
			url : '/process_ajax'
		})
		.done(function(data) {

            let height = 50;
            for (let i = 0; i < data.length; i++, height += 50) {

                let currKinase = data[i][1] + ' ';
                let currRatio = data[i][4].toFixed(2) + ', S(' + data[i][2] + '), ' + 'T(' + data[i][3] + ') ';
                let edgeID = 'et' + i;

                cy.add([
                    {group: 'nodes', data: {id: currKinase}, position: {x: 550, y: height}},
                    {group: 'edges', data: {id: edgeID, source: kinase, target: currKinase, label: currRatio}}
                ]);

                cy.nodes('[id="' + currKinase + '"]').style('shape', 'square');
                cy.edges('[id = "' + edgeID + '"]').style('line-color', '#ff0000');
            }
		});

		event.preventDefault();
	});
}