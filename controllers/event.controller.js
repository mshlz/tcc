const Event = require('../models/event.model')
const EventService = require('../services/event')

const moment = require('moment')

/**
 * Mostra a pagina com a listagem dos itens
 */
exports.index = async (req, res, next) => {
    let events = await Event.find().select('name location startDate finishDate updatedAt finished').exec().catch(err => {
        res.redirect('../', 500)
    })

    return res.render('events/index', {
        title: 'Eventos',
        list: events,
        menu: [
            {
                title: 'Adicionar novo',
                url: '/events/create',
                icon: 'plus-circle'
            }
        ],
        moment: moment
    })
}

/**
 * Mostra a pagina de add novo item
 */
exports.create = (req, res, next) => {
    return res.render('events/create', {
        title: 'Novo evento'
    })
}

/**
 * Função responsável por salvar os dados vindos da rota "create"
 */
exports.store = (req, res, next) => {
    let form = { name, description, location, days, startDate, finishDate } = req.body

    let event = {
        ...form,
        days: Number(days) || 1,
        startDate: moment(startDate, 'DD/MM/YYYY - HH:mm'),
        finishDate: moment(finishDate, 'DD/MM/YYYY - HH:mm'),
        periods: {}
    }

    let periods = {
        morning : form['periods[morning]'] == 'on' ? true : false,
        afternoon : form['periods[afternoon]'] == 'on' ? true : false,
        night : form['periods[night]'] == 'on' ? true : false,
    }

    event.periods = periods

    Event.create(event).then(doc => {
        return res.redirect('./')
    }).catch(err => {
        next()
    })
}

/**
 * Mostra a página de exibição de um item 
 */
exports.view = async (req, res, next) => {
    let event = await Event.findOne({ _id: req.params.id }).exec()

    return res.render('events/event/index', {
        title: event.name || 'Evento #BLABLA',
        event: event,
        moment: moment,
        eventMenu: 'main'
    })
}

/**
 * Mostra a página de edição de um item
 */
exports.edit = async (req, res, next) => {
    let event = await Event.findOne({ _id: req.params.id }).exec()

    return res.render('events/event/settings', {
        title: 'Configurações',
        event: event,
        moment: moment,
        eventMenu: 'settings'
    })
}

/**
 * Função responsável por salvar as alterações do item vindos da rota "edit" 
 */
exports.update = (req, res, next) => {
    let form = { name, description, location, days, hours, startDate, finishDate, finished } = req.body
    let { token, apiGlobal, apiEnroll, apiCheck, apiLectures, apiWorkshops, apiEnrolleds } = req.body
    let api = { 
        global: apiGlobal == 'on', 
        enroll: apiEnroll == 'on', 
        check: apiCheck == 'on', 
        getLectures: apiLectures == 'on', 
        getWorkshops: apiWorkshops == 'on',
        getEnrolleds: apiEnrolleds == 'on',
        token: token || '',
    }

    let event = {
        ...form,
        days: Number(days) || 1,
        hours: Number(hours) || 1,
        startDate: moment(startDate, 'DD/MM/YYYY - HH:mm'),
        finishDate: moment(finishDate, 'DD/MM/YYYY - HH:mm'),
        finished: finished == 'on' ? true : false,
        api
    }

    Event.findByIdAndUpdate(req.params.id, event).then(doc => {
        return res.redirect('./')
    })
}

/**
 * Função responsável por deletar o item do banco de dados
 */
exports.destroy = (req, res, next) => {
    Event.findByIdAndRemove(req.params.id).then(doc => {
        return res.redirect('/events')
    })
}

exports.subevents = (req, res) => {
    return res.render('events/event/subevents', {
        title: 'Subeventos'
    })
}

exports.mailSettings = async (req, res) => {
    let event = req.params.id
    event = await Event.findById(event).select('templates')
    
    template = event.templates ? event.templates.mail_enroll ? event.templates.mail_enroll : '' : ''

    return res.render('events/event/mail/edit', {
        title: 'Email',
        eventMenu: 'mail',
        form: {
            template: event.templates || {}
        }
    })
}

exports.updateMailTemplate = (req, res, next) => {
    let { template } = req.body

    let update = {
        $set: {
            'templates.mail_enroll': template || ''
        }
    }

    Event.findByIdAndUpdate(req.params.id, update).then(doc => {
        return res.redirect('./')
    })
}

exports.showStats = async (req, res) => {
    let event = await Event.findById(req.params.id).populate('lectures', 'confirmed').populate('workshops', 'confirmed')
    let enrolleds = await EventService.getEnrolleds(event._id)

    presences = enrolleds.map(e => {
        return e.presences
    })

    let periods = Object.values(event.periods).slice(1).filter(e => e).length
    let days = event.days


    // ESTATÍSTICAS DE PRESENÇA
    _days = []
    
    for (i=0; i<days; i++) {
        _days[i] = []
        for (j=0; j<periods; j++) {
            _days[i][j] = 0
        }
    }

    presences.map(e => {
        e = e.map(e => e ? true : false)                // corrige null
        while (e.length < days*periods) e.push(false)   // corrige empty
        
        day = []
        for (i=0; i<days; i++) {
            day[i] = e.slice(i*periods, (i+1)*periods)
            for (j=0; j<periods; j++) {
                if (day[i][j]) _days[i][j]++
            }
        }
        
        return e
    })
    
    namePeriods = Object.keys(event.periods).slice(1).filter(e => event.periods[e])

    let stats = {
        byDay: _days,
        periods: namePeriods
    }

    // ESTATÍSTICAS DE PALESTRAS
    stats['lectures'] = {
        total: event.lectures.length,
        confirmed: event.lectures.filter(e => e.confirmed).length,
        notConfirmed: event.lectures.filter(e => !e.confirmed).length
    }

    // ESTATÍSTICAS DE PALESTRAS
    stats['workshops'] = {
        total: event.workshops.length,
        confirmed: event.workshops.filter(e => e.confirmed).length,
        notConfirmed: event.workshops.filter(e => !e.confirmed).length
    }

    // ESTATÍSTICAS DE INSCRITOS/INSTITUIÇÃO
    let users = enrolleds.map(e => e.user)
    let institutions = []

    users.forEach(e => {
        i = e.instituicao || null

        if (i)
            institutions[i] = institutions[i] ? ++institutions[i] : 1

    })

    stats['institutions'] = {
        labels: Object.keys(institutions),
        data: Object.values(institutions)
    }

    // RENDER PAGE
    return res.render('events/event/stats/index', {
        title: 'Estatistícas',
        event,
        presences,
        stats,
        eventMenu: 'stats',
        gs:true
    })
}

getEvents = async (params) => {
    return await Event.find(params).select('name description location days hours periods startDate finishDate finished')
}

exports.api = {

    getAll: async (req, res) => {
        let events = await getEvents({})
        return res.json(events)
    },

    getById: async (req, res) => {
        let id = req.params.id

        try {
            event = await getEvents({ _id: id })
            return res.json(event[0])
        } catch(e) {
            return res.status(400)
                        .json({errors: ['Evento não encontrado']})
        }
    },

    getByIdFull: async (req, res) => {
        let id = req.params.id

        try {
            event = await getEvents({ _id: id })
            event = event[0]

            lectures = await EventService.getLectures(id)
            event.lectures = lectures

            workshops = await EventService.getWorkshops(id)
            event.workshops = workshops


            return res.json(event)
        } catch(e) {
            return res.status(400)
                        .json({errors: ['Evento não encontrado']})
        }
    },

    getLectures: async (req, res) => {
        let id = req.params.id

        try {
            lectures = await EventService.getLectures(id)
            return res.json(lectures)
        } catch(e) {
            return res.status(400)
                        .json({errors: ['Palestra não encontrado']})
        }
    },

    getWorkshops: async (req, res) => {
        let id = req.params.id

        try {
            workshops = await EventService.getWorkshops(id)
            
            return res.json(workshops)
        } catch(e) {
            return res.status(400)
                        .json({errors: ['Oficinas não encontradas']})
        }
    },

    getWorkshop: async (req, res) => {
        let event = req.params.id
        let w_id = req.params.workshop

        try {
            let workshop = await EventService.getWorkshop(w_id, event)
            
            return res.json(workshop)
        } catch(e) {
            return res.status(400)
                        .json({errors: ['Oficina não encontrada']})
        }
    },

    getEnrolleds: async (req, res) => {
        let id = req.params.id

        try {
            enrolleds = await EventService.getEnrolleds(id)
            
            return res.json(enrolleds)
        } catch(e) {
            return res.status(400)
                        .json({errors: [e]})
        }
    },

    postEnroll: async (req, res) => {
        let id = req.params.id
        let data = { name, cpf, email, birthdate, institution } = req.body
        let user = {
            ...data,
            birthdate: new Date(Number(birthdate))
        }

        try {
            user = await EventService.enroll(user, id)            
            return res.json(user)
        } catch(e) {
            return res.status(400)
                        .json({errors: [e]})
        }
    },

    postCheck: async (req, res) => {
        let id = req.params.id
        let user = { cpf } = req.body

        try {
            ticket = await EventService.checkEnroll(user, id)           
            
            return res.json({
                message: 'Usuário está inscrito!',
                data: ticket
            })
        } catch(e) {
            return res.status(400)
                        .json({errors: [e]})
        }
    }
}
