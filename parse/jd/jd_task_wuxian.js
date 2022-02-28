const Template = require('../../template');

class Main extends Template {
    constructor() {
        super()
        this.title = "京东无线活动整合"
        this.task = 'local'
        this.verify = 1
        this.manual = 1
        this.readme = `filename_custom="url1|host=id|id"`
        this.import = ['fs']
    }

    async prepare() {
        this.assert(this.custom, '请先添加环境变量')
        let custom = this.getValue('custom')
        for (let i of custom) {
            let s = this.match(/\/\/([^\/]+)\/.+?(\w{32})/, i)
            if (s) {
                this.code.push({
                    host: s[0],
                    activityId: s[1],
                })
            }
            else {
                s = this.match(/\s*([^\=]+)\s*=\s*(\w{32})/, i)
                if (s) {
                    this.code.push({
                        host: s[0].includes('isvjcloud.com') ? s[0] : `${s[0]}.isvjcloud.com`,
                        activityId: s[1],
                    })
                }
                else if (i.length == 32) {
                    this.code.push({
                        activityId: i
                    })
                }
            }
        }
        let array = [
            "lzkj-isv.isvjcloud.com",
            "cjhy-isv.isvjcloud.com",
        ]
        for (let i of this.code) {
            for (let host of array) {
                let p = await this.response({
                        'url': `https://${host}/wxCommonInfo/token`,
                    }
                )
                var s = await this.curl({
                        'url': `https://${host}/customer/getSimpleActInfoVo`,
                        'form': `activityId=${i.activityId}`,
                        cookie: p.cookie
                    }
                )
                if (!this.haskey(s, 'data')) {
                    switch (host) {
                        case "cjhy-isv.isvjcloud.com":
                            var h = await this.response({
                                    'url': `https://${host}/wxCollectionActivity/activity?activityId=${i.activityId}`,
                                }
                            )
                            break
                        default:
                            var h = await this.response({
                                    'url': `https://${host}/wxCollectionActivity/activity2/${i.activityId}?activityId=${i.activityId}`,
                                }
                            )
                            break
                    }
                    s = await this.curl({
                            'url': `https://${host}/customer/getSimpleActInfoVo`,
                            form: `activityId=${i.activityId}`,
                            cookie: h.cookie
                        }
                    )
                }
                if (this.haskey(s, 'data')) {
                    let data = s.data
                    data.host = host
                    switch (data.activityType) {
                        case 6:
                            data.type = 'addCart'
                            break
                        case 12:
                        case 13:
                            data.type = 'drawActivity'
                            break
                        case 24:
                        case 73:
                            data.type = 'shopGift'
                            break
                        case 46:
                            data.type = 'openCard'
                            break
                        case 26:
                            data.type = 'wxDraw'
                            break
                    }
                    this.shareCode.push(data)
                    break
                }
            }
        }
    }

    async main(p) {
        let pin = this.userPin(p.cookie)
        let host = p.inviter.host
        let activityId = p.inviter.activityId
        let type = p.inviter.type
        let venderId = p.inviter.venderId
        let shopId = p.inviter.shopId
        let gifts = []
        if (venderId) {
            let follow = await this.curl({
                'url': 'https://api.m.jd.com/client.action?g_ty=ls&g_tk=518274330',
                'form': `functionId=followShop&body={"follow":"true","shopId":"${shopId}","venderId":"${venderId}","award":"true","sourceRpc":"shop_app_home_follow"}&osVersion=13.7&appid=wh5&clientVersion=9.2.0&loginType=2&loginWQBiz=interact`,
                cookie: p.cookie
            })
        }
        let isvObfuscator = await this.curl({
            url: 'https://api.m.jd.com/client.action',
            form: 'functionId=isvObfuscator&body=%7B%22id%22%3A%22%22%2C%22url%22%3A%22https%3A%2F%2Fddsj-dz.isvjcloud.com%22%7D&uuid=5162ca82aed35fc52e8&client=apple&clientVersion=10.0.10&st=1631884203742&sv=112&sign=fd40dc1c65d20881d92afe96c4aec3d0',
            cookie: p.cookie
        })
        let token = await this.response({
                'url': `https://${host}/wxCommonInfo/token`,
            }
        )
        var getPin = await this.response({
                'url': `https://${host}/customer/getMyPing`,
                form: `userId=${venderId}&token=${isvObfuscator.token}&fromType=APP`,
                cookie: token.cookie
            }
        )
        if (!this.haskey(getPin, 'content.data.secretPin')) {
            switch (host) {
                case "cjhy-isv.isvjcloud.com":
                    var h = await this.response({
                            'url': `https://${host}/wxCollectionActivity/activity?activityId=${activityId}`,
                        }
                    )
                    break
                default:
                    var h = await this.response({
                            'url': `https://${host}/wxCollectionActivity/activity2/${activityId}?activityId=${activityId}`,
                        }
                    )
                    break
            }
            let info = await this.response({
                    'url': `https://${host}/customer/getSimpleActInfoVo`,
                    form: `activityId=${activityId}`,
                    cookie: h.cookie
                }
            )
            var getPin = await this.response({
                    'url': `https://${host}/customer/getMyPing`,
                    form: `userId=${venderId}&token=${isvObfuscator.token}&fromType=APP`,
                    cookie: info.cookie
                }
            )
        }
        if (!this.haskey(getPin, 'content.data.secretPin')) {
            console.log(`可能是黑号或者黑ip,停止运行`)
            return
        }
        var secretPin = getPin.content.data.secretPin
        console.log('secretPin', secretPin)
        switch (host) {
            case "cjhy-isv.isvjcloud.com":
                secretPin = escape(encodeURIComponent(secretPin))
                break
            default:
                secretPin = encodeURIComponent(secretPin)
                break
        }
        if (['drawActivity'].includes(type)) {
            var url = `https://${host}/wxDrawActivity/activityContent`
        }
        else if (['wxDraw'].includes(type)) {
            var url = `https://${host}/wxPointDrawActivity/activityContent`
        }
        else if (['addCart'].includes(type)) {
            var url = `https://${host}/wxCollectionActivity/activityContent`
        }
        else if (['shopGift'].includes(type)) {
            var url = `https://${host}/wxShopGift/activityContent`
        }
        else {
            var url = `https://${host}/wxCollectionActivity/activityContent`
        }
        var activityContent = await this.response({
                url,
                'form': `pin=${secretPin}&activityId=${activityId}&buyerPin=${secretPin}`,
                cookie: `${getPin.cookie};`
            }
        )
        // console.log(activityContent)
        if (!this.haskey(activityContent, 'content.result')) {
            console.log(activityContent.content.errorMessage)
            // console.log("活动可能失效或者不在支持的范围内,跳出运行")
            return
        }
        let need = this.haskey(activityContent, 'content.data.needCollectionSize')
        let has = this.haskey(activityContent, 'content.data.hasCollectionSize')
        let skus = await this.curl({
                'url': `https://${host}/act/common/findSkus`,
                'form': `actId=${activityId}&userId=${venderId}&type=6`,
                cookie: `${getPin.cookie}`
            }
        )
        let wxFollow = await this.response({
                'url': `https://${host}/wxActionCommon/followShop`,
                'form': `userId=${venderId}&buyerNick=${secretPin}&activityId=${activityId}&activityType=${p.inviter.activityType}`,
                cookie: `${getPin.cookie}`
            }
        )
        // console.log(wxFollow)
        let skuList = this.column(skus.skus, 'skuId').map(d => d.toString())
        if (skuList.length) {
            console.log(`加购列表: ${this.dumps(skuList)}`)
        }
        if (['addCart'].includes(type)) {
            switch (host) {
                case "cjhy-isv.isvjcloud.com":
                    cookie = `${getPin.cookie}`
                    for (let k of skuList) {
                        let addOne = await this.response({
                                'url': `https://${host}/wxCollectionActivity/addCart`,
                                'form': `activityId=${activityId}&pin=${secretPin}&productId=${k}`,
                                cookie
                            }
                        )
                        console.log(`加购: ${k}`)
                        if (this.haskey(addOne, 'data.hasAddCartSize') == need) {
                            break
                        }
                        var cookie = `${addOne.cookie};AUTH_C_USER=${secretPin};`
                    }
                    break
                default:
                    for (let z = 0; z<3; z++) {
                        var add = await this.response({
                                'url': `https://${host}/wxCollectionActivity/oneKeyAddCart`,
                                form: `activityId=${activityId}&pin=${secretPin}&productIds=${this.dumps(this.column(skus.skus, 'skuId'))}`,
                                cookie: `${getPin.cookie}`
                            }
                        )
                        await this.wait(1000)
                    }
                    var cookie = `${add.cookie};AUTH_C_USER=${secretPin};`
                    break
            }
            console.log("加购有延迟,等待3秒...")
            await this.wait(3000)
            while (1) {
                let getPrize = await this.curl({
                        'url': `https://${host}/wxCollectionActivity/getPrize`,
                        form: `activityId=${activityId}&pin=${secretPin}`,
                        cookie
                    }
                )
                if (this.haskey(getPrize, 'data.drawOk')) {
                    console.log(`获得: ${getPrize.data.name}`)
                    gifts.push(getPrize.data.name)
                }
                else {
                    console.log(getPrize.errorMessage);
                }
                if (!this.haskey(getPrize, 'data.canDrawTimes')) {
                    break
                }
            }
        }
        else if (['drawActivity'].includes(type)) {
            while (1) {
                let draw = await this.curl({
                        'url': `https://${host}/wxDrawActivity/start`,
                        'form': `pin=${secretPin}&activityId=${activityId}`,
                        cookie: `${getPin.cookie}`
                    }
                )
                console.log(draw)
                if (this.haskey(draw, 'data.drawOk')) {
                    gifts.push(draw.data.drawInfo.name)
                    console.log(`获得奖品: ${draw.data.drawInfo.name}`)
                }
                if (!this.haskey(draw, 'data.canDrawTimes')) {
                    break
                }
            }
        }
        else if (['wxDraw'].includes(type)) {
            while (1) {
                let draw = await this.curl({
                        'url': `https://${host}/wxPointDrawActivity/start`,
                        'form': `pin=${secretPin}&activityId=${activityId}`,
                        cookie: `${getPin.cookie}`
                    }
                )
                console.log(draw)
                if (this.haskey(draw, 'data.drawOk')) {
                    gifts.push(draw.data.drawInfo.name)
                    console.log(`获得奖品: ${draw.data.drawInfo.name}`)
                }
                if (!this.haskey(draw, 'data.canDrawTimes')) {
                    break
                }
            }
        }
        else if (['shopGift'].includes(type)) {
            let ad = await this.response({
                    'url': `https://${host}/common/accessLogWithAD`,
                    'form': `venderId=${venderId}&code=24&pin=${encodeURIComponent(getPin.content.data.secretPin)}&activityId=${activityId}&pageUrl=https%3A%2F%2Flzkj-isv.isvjcloud.com%2FwxShopGift%2Factivity%3FactivityId%3D${activityId}`,
                    cookie: getPin.cookie
                }
            )
            let ac = await this.response({
                    'url': `https://${host}/wxShopGift/activityContent`,
                    'form': `activityId=${activityId}&buyerPin=${encodeURIComponent(getPin.content.data.secretPin)}`,
                    cookie: ad.cookie
                }
            )
            let draw = await this.curl({
                    'url': `https://${host}/wxShopGift/draw`,
                    'form': `activityId=${activityId}&buyerPin=${encodeURIComponent(getPin.content.data.secretPin)}&hasFollow=false&accessType=app`,
                    cookie: ac.cookie
                }
            )
            console.log(draw)
            if (draw.result) {
                console.log(ac.content)
                let g = {
                    'jd': '京豆',
                    'jf': '积分'
                }
                for (let i of this.haskey(ac.content, 'data.list')) {
                    gifts.push(
                        `${i.takeNum}${g[i.type]}`
                    )
                }
            }
        }
        if (gifts.length) {
            this.notices(gifts.join("\n"), p.user)
        }
        await this.curl({
            'url': 'https://api.m.jd.com/client.action?g_ty=ls&g_tk=518274330',
            'form': `functionId=followShop&body={"follow":"false","shopId":"${shopId}","venderId":"${venderId}","award":"true","sourceRpc":"shop_app_home_follow"}&osVersion=13.7&appid=wh5&clientVersion=9.2.0&loginType=2&loginWQBiz=interact`,
            cookie: p.cookie
        })
        if (skuList.length) {
            let s = await this.curl({
                    'url': `https://wq.jd.com/deal/mshopcart/rmvCmdy?sceneval=2&g_login_type=1&g_ty=ajax`,
                    'form': `pingouchannel=0&commlist=123,,1,123,11,123,0,skuUuid:aaa@@useUuid:0&type=0&checked=0&locationid=&templete=1&reg=1&scene=0&version=20190418&traceid=1394319544881167891&tabMenuType=1&sceneval=2`,
                    cookie: p.cookie
                }
            )
            let list = []
            let name = []
            let n = 0
            try {
                let cart = s.cart.venderCart
                for (let i of cart) {
                    for (let items of i.sortedItems) {
                        for (let products of items.polyItem.products) {
                            if (skuList.includes(products.mainSku.id.toString())) {
                                if (this.haskey(items, 'polyItem.promotion.pid')) {
                                    list.push(`${products.mainSku.id},,1,${products.mainSku.id},11,${items.polyItem.promotion.pid},0,skuUuid:${products.skuUuid}@@useUuid:0`)
                                }
                                else {
                                    list.push(
                                        `${products.mainSku.id},,1,${products.mainSku.id},1,,0,skuUuid:${products.skuUuid}@@useUuid:0`
                                    )
                                }
                                name.push(
                                    `${products.mainSku.id} -- ${products.mainSku.name}`
                                )
                                n++
                            }
                        }
                    }
                }
            } catch (e) {
            }
            if (list.length) {
                s = await this.curl({
                        'url': `https://wq.jd.com/deal/mshopcart/rmvCmdy?sceneval=2&g_login_type=1&g_ty=ajax`,
                        'form': `pingouchannel=0&commlist=${list.join("$")}&checked=0&locationid=&templete=1&reg=1&scene=0&version=20190418&traceid=&tabMenuType=1&sceneval=2`,
                        cookie: p.cookie
                    }
                )
                console.log(`删除购物车商品数: ${list.length}`)
            }
        }
    }
}

module.exports = Main;