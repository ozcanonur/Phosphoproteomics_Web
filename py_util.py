import sqlite3
import pandas as pd


def dict_unique_phospho_obs(perturbagen, p_threshold, cell_line, dict={}):
    conn = sqlite3.connect("C:/Users/Onur/PycharmProjects/Flasky/chemphopro.db")

    queryString = 'select * from Observation_new ' \
                  'where perturbagen = "{}" and p_value < {} ' \
                  'and cell_line = "{}"'.format(perturbagen, p_threshold, cell_line)

    df = pd.read_sql_query(queryString, conn)

    for index, row in df.iterrows():

        entry_info = [perturbagen, row['protein'],
                                row['phosphosite'], row['cell_line'], row['fold_change'],
                                row['p_value'], row['cv'], row['score']]

        dict[(row['protein'], row['phosphosite'])] = entry_info

    return dict


'''*******************************************'''
'''TOP DOWN PATHWAY'''
'''*******************************************'''

def rel_dict_topdown(obs_dict, dict={}):
    conn = sqlite3.connect("chemphopro.db")

    df = pd.read_sql_query('select distinct ENTITYA, ENTITYB, RESIDUE, effect, mechanism '
                           'from human_pathway_relations where ENTITYA != ENTITYB and effect != "unknown" order by ENTITYA',
                           conn)

    for index, row in df.iterrows():
        affecting_kinase = row[0]
        affected_kinase = row[1]
        affected_phosphosite = row[2]
        affected_effect = row[3]
        affected_mechanism = row[4]

        if 'up' in affected_effect:
            effect = 'up'
        else:
            effect = 'down'

        if 'de' in affected_mechanism:
            mechanism = '-p'
        else:
            mechanism = '+p'

        if (affected_kinase, affected_phosphosite) not in obs_dict:
            continue

        new_entry = affected_kinase + '_' + affected_phosphosite + '_' + effect + '_' + mechanism

        if affecting_kinase in dict:
            if new_entry not in dict[affecting_kinase]:
                curr_value = dict[affecting_kinase][:]
                curr_value.append(new_entry)

                dict[affecting_kinase] = curr_value
        else:
            dict[affecting_kinase] = [new_entry]

    return dict


def check_if_exists_topdown(node, path):
    for element in path:
        protein = node.split('_')[0]
        if element[1] == protein or element == protein:
            return True
    return False


def topdown_path(rel_dict, obs_dict, start, path=[]):

    split = start.split('_')
    if len(split) > 1 and (split[0], split[1]) in obs_dict:
        p_info = obs_dict[(split[0],split[1])][:]
        p_info.append(split[2])
        p_info.append(split[3])
        path = path + [p_info]
    else:
        path = path + [start]

    curr_kinase = start.split('_')[0]
    if curr_kinase not in rel_dict:
        return [path]

    paths = []
    newpaths = []

    for node in rel_dict[curr_kinase]:
        if not check_if_exists_topdown(node, path):
            newpaths = topdown_path(rel_dict, obs_dict, node, path)
        for newpath in newpaths:
            paths.append(newpath)
    return paths

'''*******************************************'''
'''*******************************************'''


'''*******************************************'''
'''BOTTOM UP PATHWAY'''
'''*******************************************'''

def rel_dict_bottomup(obs_dict, dict={}):
    conn = sqlite3.connect("C:/Users/Onur/PycharmProjects/Flasky/chemphopro.db")

    queryString =   'select distinct second_table.ENTITYA as left_prot, second_table.ENTITYB as mid_prot_2, ' \
                    'second_table.residue as mid_ps_2, ' \
                    'first_table.ENTITYA as mid_prot, first_table.ENTITYB as right_prot, first_table.residue as right_ps, ' \
                    'first_table.Effect as right_effect, first_table.MECHANISM as right_mechanism ' \
                    'from ' \
                    '(select * from human_pathway_relations where ENTITYA <> ENTITYB and effect <> "unknown") as first_table ' \
                    'left join ' \
                    '(select * from human_pathway_relations where ENTITYA <> ENTITYB and effect <> "unknown") as second_table ' \
                    'on first_table.ENTITYA = second_table.ENTITYB ' \
                    'where left_prot is null or left_prot <> right_prot ' \
                    'group by mid_prot, mid_ps_2, right_prot, right_ps order by right_prot, right_ps'

    df = pd.read_sql_query(queryString, conn)

    for index, row in df.iterrows():

        affected_target = row['right_prot'] + '_' + row['right_ps']
        affected_effect = row['right_effect']
        affected_mechanism = row['right_mechanism']

        if 'up' in affected_effect:
            effect = 'up'
        else:
            effect = 'down'

        if 'de' in affected_mechanism:
            mechanism = '-p'
        else:
            mechanism = '+p'

        if row['left_prot'] is None:
            new_entry = row['mid_prot'] + '_' + effect + '_' + mechanism
        elif (row['mid_prot'], row['mid_ps_2']) in obs_dict and (row['right_prot'], row['right_ps']) in obs_dict:
            new_entry = row['mid_prot'] + '_' + row['mid_ps_2'] + '_' + effect + '_' + mechanism
        else:
            continue

        if affected_target in dict:
            if new_entry not in dict[affected_target]:
                curr_value = dict[affected_target][:]
                curr_value.append(new_entry)

                dict[affected_target] = curr_value
        else:
            dict[affected_target] = [new_entry]

    return dict


def check_if_exists_bottomup(node, path):
    prot_and_ps = node.split('_')[0] + '_' + node.split('_')[1]
    for element in path:
        if element == prot_and_ps or element[1] + '_' + element[2] == prot_and_ps:
            return True
    return False


def bottomup_path(rel_dict, obs_dict, start, path=[]):

    split = start.split('_')
    if len(split) > 3:
        p_info = obs_dict[(split[0], split[1])][:]
        p_info.append(split[2])
        p_info.append(split[3])
        path = path + [p_info]
        start = split[0] + '_' + split[1]
    else:
        path = path + [start]

    if start not in rel_dict:
        return [path]

    paths = []
    newpaths = []

    for node in rel_dict[start]:
        if not check_if_exists_bottomup(node, path):
            newpaths = bottomup_path(rel_dict, obs_dict, node, path)
        for newpath in newpaths:
            paths.append(newpath)
    return paths

'''*******************************************'''
'''*******************************************'''
