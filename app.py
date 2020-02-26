from flask import Flask, render_template, request, jsonify
import sqlite3
import pandas as pd


app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def index():
    conn = sqlite3.connect("chemphopro.db")

    # Get Perturbagen list
    df = pd.read_sql_query('Select distinct perturbagen from Observation where fold_change < 0'
                           ' and fold_change > -888', conn)
    perturbagenList = df.values.tolist()

    # Get Kinase list
    df = pd.read_sql_query('Select distinct kinase from KS_relationship', conn)
    kinaseList = df.values.tolist()

    # Return index.html with perturbagen and kinase list filled
    return render_template('index.html', perturbagenList=perturbagenList,
                           kinaseList=kinaseList)

# Processing ajax requests
@app.route('/process_ajax', methods=['POST'])
def process_ajax():

    conn = sqlite3.connect("chemphopro.db")
    # Get the option from the ajax request
    option = request.form['option']

    # Return filtered kinase list depending on the Perturbagen & Kinase interactions
    if option == 'filter_kinase':
        perturbagen = request.form['perturbagen']

        queryString = "Select distinct kinase from results_PK where perturbagen=\'{}\'".format(perturbagen)
        df = pd.read_sql_query(queryString, conn)
        result = df.values.tolist()

        return jsonify(result)

    # Return all interactions with scores for this Perturbagen & Kinase combo
    elif option == 'get_PKT':
        perturbagen = request.form['perturbagen']
        kinase = request.form['kinase']

        queryString = "Select Perturbagen, Kinase, Target, Effect, Perturbs_Score, Coloc_Score, KT_Assoc_Score, Score " \
                      "from results_PKT where perturbagen = '{}' and kinase = '{}'".format(perturbagen, kinase)

        df = pd.read_sql_query(queryString, conn)
        df.sort_values(by=['Score'], inplace=True, ascending=False)
        result = df.values.tolist()

        return jsonify(result)

    # Return all interactions for this Perturbagen
    elif option == 'get_allfor_P':
        perturbagen = request.form['perturbagen']

        queryString = "Select Perturbagen, Kinase, Target, Effect, Perturbs_Score, Coloc_Score, KT_Assoc_Score, Score " \
                      "from results_PKT where perturbagen = '{}'".format(perturbagen)

        df = pd.read_sql_query(queryString, conn)
        df.sort_values(by=['Kinase', 'Target', 'Score'], inplace=True)

        result = df.values.tolist()

        return jsonify(result)

    # Return all interactions for this Kinase
    elif option == 'get_allfor_K':

        kinase = request.form['kinase']

        queryString = "Select Perturbagen, Kinase, Score " \
                      "from results_PK where kinase = '{}' order by Score desc limit 10".format(kinase)

        df = pd.read_sql_query(queryString, conn)

        result = df.values.tolist()

        return jsonify(result)

    # Return Perturbagen & Kinase scores by applying majority rule
    elif option == 'get_PK':

        perturbagen = request.form['perturbagen']
        kinase = request.form['kinase']

        queryString = "Select * from results_PKT where perturbagen = '{}' and kinase = '{}'".format(perturbagen, kinase)

        df = pd.read_sql_query(queryString, conn)

        downSum = df.loc[df['Effect'] == 'down', 'Score'].sum()
        upSum = df.loc[df['Effect'] == 'up', 'Score'].sum()
        ratio = downSum * (downSum / (downSum + upSum))

        result = [perturbagen, kinase, ratio]

        return jsonify(result)

    # Return perturbation details(fc, p, ..) for the selected P & K & T combo
    elif option == 'get_perturbs_details':

        perturbagen = request.form['perturbagen']
        target = request.form['target']

        queryString = "Select Perturbagen, substrate as target, fold_change, p_value, cv from Observation where " \
                      "cell_line = 'MCF-7' and perturbagen = '{}' and target = '{}'".format(perturbagen, target)

        df = pd.read_sql_query(queryString, conn)

        result = df.values.tolist()

        return jsonify(result)

    # Return colocalisation details(secretory, cytosol probs etc..) for selected P & K & T combo
    elif option == 'get_coloc_details':

        kinase = request.form['kinase']
        target = request.form['target']

        if len(target.split('(')) == 2:
            target = target.split('(')[0]

        queryString = 'Select * from protein_loc where protein = "{}" or protein = "{}"'.format(kinase, target)

        df = pd.read_sql_query(queryString, conn)

        result = df.values.tolist()

        return jsonify(result)

    # Return uniqueness scores for the selected target
    elif option == 'get_uniqueness_details':

        target = request.form['target']

        queryString = "Select Kinase, Target, Score from results_kinase_effectiveness " \
                      "where target = '{}'".format(target)

        df = pd.read_sql_query(queryString, conn)
        df.sort_values(by='Score', inplace=True, ascending=False)

        result = df.values.tolist()

        return jsonify(result)

    elif option == 'get_kinase_similarity_perturbagen_details':

        kinase = request.form['kinase']

        queryString = 'select * from results_similarity_perturbagen ' \
                      'where K1 = "{}" order by Ratio desc limit 7'.format(kinase)

        df = pd.read_sql_query(queryString, conn)

        result = df.values.tolist()

        return jsonify(result)

    elif option == 'get_kinase_similarity_target_details':

        kinase = request.form['kinase']

        queryString = 'select * from results_similarity_target ' \
                      'where K1 = "{}" order by Ratio desc limit 7'.format(kinase)

        df = pd.read_sql_query(queryString, conn)

        result = df.values.tolist()

        return jsonify(result)

    elif option == 'get_pathway_for_kinase':

        kinase = request.form['kinase']

        # TODO ACTUALLY NEEDS DESCENDING, AND NO LIMIT
        queryString = 'select Target, Score from kt_assoc where Kinase = "{}" order by Score limit 7'.format(kinase)

        df = pd.read_sql_query(queryString, conn)

        result = df.values.tolist()

        return jsonify(result)

    elif option == 'get_pathway_for_PK':

        kinase = request.form['kinase']

        queryString = 'select Perturbagen, Score from results_PK where kinase = "{}" order by Score desc'.format(kinase)

        df = pd.read_sql_query(queryString, conn)

        result = df.values.tolist()

        return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True)